/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { execSync } from 'child_process';
import { Logger, createComponentLogger } from '@salesforce/magen-mcp-workflow';
import * as path from 'path';
import dedent from 'dedent';
import { existsSync, writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import * as os from 'os';

/**
 * Result of an Xcode project synchronization operation
 */
export interface XcodeSyncResult {
  success: boolean;
  filesAdded?: string[];
  filesRemoved?: string[];
  target?: string;
  error?: string;
  warnings?: string;
}

/**
 * Parameters for synchronizing Xcode project with file system
 */
export interface XcodeSyncParams {
  projectPath: string;
  xcodeProjectPath: string;
  filesToAdd: string[];
  filesToRemove: string[];
  targetName: string;
}

/**
 * Service for managing Xcode project files programmatically.
 * Executes Ruby commands using the xcodeproj gem to add/remove files
 * from the Xcode project without requiring agent intervention.
 */
export class XcodeProjectManagementService {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createComponentLogger('XcodeProjectManagementService');
  }

  /**
   * Synchronizes the Xcode project to match the actual file system state.
   * Adds new files and removes deleted files from the project.pbxproj file.
   *
   * @param params - Parameters specifying what files to add/remove
   * @returns Result indicating success/failure and what was changed
   */
  syncProject(params: XcodeSyncParams): XcodeSyncResult {
    const { projectPath, xcodeProjectPath, filesToAdd, filesToRemove, targetName } = params;

    // Validate that the Xcode project exists
    const fullXcodeProjectPath = path.resolve(projectPath, xcodeProjectPath);
    const pbxprojPath = path.join(fullXcodeProjectPath, 'project.pbxproj');

    if (!existsSync(pbxprojPath)) {
      const error = `Xcode project file not found: ${pbxprojPath}`;
      this.logger.error(error);
      return { success: false, error };
    }

    // Convert relative paths to absolute paths
    const absoluteFilesToAdd = filesToAdd.map(file =>
      path.isAbsolute(file) ? file : path.resolve(projectPath, file)
    );
    const absoluteFilesToRemove = filesToRemove.map(file =>
      path.isAbsolute(file) ? file : path.resolve(projectPath, file)
    );

    // Validate that files to add actually exist
    const missingFiles = absoluteFilesToAdd.filter(file => !existsSync(file));
    if (missingFiles.length > 0) {
      const error = `Cannot add non-existent files: ${missingFiles.join(', ')}`;
      this.logger.error(error);
      return { success: false, error };
    }

    // Generate the Ruby command
    const rubyCommand = this.buildRubyCommand(
      fullXcodeProjectPath,
      targetName,
      absoluteFilesToAdd,
      absoluteFilesToRemove
    );

    this.logger.debug('Executing xcodeproj Ruby command', {
      projectPath: fullXcodeProjectPath,
      filesToAdd: absoluteFilesToAdd.length,
      filesToRemove: absoluteFilesToRemove.length,
    });

    // Execute the Ruby command
    try {
      const result = this.executeRubyCommand(rubyCommand);
      this.logger.info('Xcode project sync completed successfully', {
        filesAdded: result.filesAdded?.length || 0,
        filesRemoved: result.filesRemoved?.length || 0,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to execute xcodeproj command', error as Error);
      return {
        success: false,
        error: `Xcode project sync failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Executes a Ruby script synchronously and parses the JSON output
   * Writes the script to a temp file to avoid shell escaping issues
   */
  private executeRubyCommand(rubyScript: string): XcodeSyncResult {
    let tempDir: string | undefined;
    let tempFile: string | undefined;

    try {
      // Create a temporary directory and file for the Ruby script
      tempDir = mkdtempSync(path.join(os.tmpdir(), 'xcode-sync-'));
      tempFile = path.join(tempDir, 'sync_script.rb');

      // Write the Ruby script to the temp file
      writeFileSync(tempFile, rubyScript, 'utf-8');

      // Execute the Ruby script from the file
      const stdout = execSync(`ruby "${tempFile}"`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        encoding: 'utf-8',
      });

      // Parse JSON output from Ruby script
      const result = JSON.parse(stdout);

      if (!result.success) {
        return {
          success: false,
          error: result.error || result.message || 'Unknown error from Ruby script',
        };
      }

      return {
        success: true,
        filesAdded: result.filesAdded || [],
        filesRemoved: result.filesRemoved || [],
        target: result.target,
        warnings: result.warnings,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ruby command execution failed: ${error.message}`);
      }
      throw error;
    } finally {
      // Clean up temp file and directory
      if (tempFile && existsSync(tempFile)) {
        try {
          unlinkSync(tempFile);
        } catch (_e) {
          // Ignore cleanup errors
        }
      }
      if (tempDir && existsSync(tempDir)) {
        try {
          unlinkSync(tempDir);
        } catch (_e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Builds the Ruby script using the xcodeproj gem
   */
  private buildRubyCommand(
    projectPath: string,
    targetName: string,
    filesToAdd: string[],
    filesToRemove: string[]
  ): string {
    // Escape strings for Ruby (only escape single quotes since we're using single-quoted strings)
    const escapeForRuby = (str: string) => str.replace(/'/g, "\\'");

    const escapedProjectPath = escapeForRuby(projectPath);
    const escapedTargetName = targetName ? `'${escapeForRuby(targetName)}'` : 'nil';
    const escapedFilesToAdd = filesToAdd.map(fp => `'${escapeForRuby(fp)}'`).join(', ');
    const escapedFilesToRemove = filesToRemove.map(fp => `'${escapeForRuby(fp)}'`).join(', ');

    const rubyScript = dedent`
      require 'xcodeproj'
      require 'json'
      require 'pathname'

      begin
        project_path = '${escapedProjectPath}'
        target_name = ${escapedTargetName}
        files_to_add = [${escapedFilesToAdd}]
        files_to_remove = [${escapedFilesToRemove}]

        unless File.exist?(project_path)
          puts JSON.generate({
            success: false,
            error: 'Project file not found',
            message: "Could not find Xcode project at #{project_path}"
          })
          exit 1
        end

        project = Xcodeproj::Project.open(project_path)
        target = target_name ? project.targets.find { |t| t.name == target_name } : project.targets.first

        unless target
          puts JSON.generate({
            success: false,
            error: 'Target not found',
            message: target_name ? "Could not find target '#{target_name}'" : 'No targets found in project'
          })
          exit 1
        end

        # Find the source group (typically the project name group)
        source_group = project.main_group.children.find { |child| 
          child.is_a?(Xcodeproj::Project::Object::PBXGroup) && 
          child != project.products_group &&
          child.path != nil &&
          !child.path.empty?
        }
        
        # Fallback to main_group if no source group found
        if source_group.nil?
          source_group = project.main_group
        end

        files_added = []
        files_failed = []
        files_removed = []
        files_remove_failed = []

        # First, remove files that need to be deleted
        files_to_remove.each do |file_path|
          begin
            project_dir = File.dirname(project_path)
            relative_path = Pathname.new(file_path).relative_path_from(Pathname.new(project_dir)).to_s
            
            # Find the file reference in the project recursively
            file_ref = nil
            project.main_group.recursive_children.each do |child|
              if child.is_a?(Xcodeproj::Project::Object::PBXFileReference)
                # Match by relative path or by display name
                if child.path == relative_path || child.real_path.to_s == file_path
                  file_ref = child
                  break
                end
              end
            end
            
            if file_ref
              # Remove from all build phases
              target.build_phases.each do |phase|
                if phase.respond_to?(:files)
                  phase.files.each do |build_file|
                    if build_file.file_ref == file_ref
                      phase.remove_file_reference(file_ref)
                      break
                    end
                  end
                end
              end
              
              # Remove from its parent group
              if file_ref.parent
                file_ref.parent.remove_reference(file_ref)
              end
              
              files_removed << File.basename(file_path)
            else
              files_remove_failed << "#{file_path}: File reference not found in project"
            end
          rescue => e
            files_remove_failed << "#{file_path}: #{e.message}"
          end
        end

        # Then, add new files
        files_to_add.each do |file_path|
          unless File.exist?(file_path)
            files_failed << file_path
            next
          end

          begin
            project_dir = File.dirname(project_path)
            relative_path = Pathname.new(file_path).relative_path_from(Pathname.new(project_dir)).to_s
            
            # Determine the target group for this file
            target_group = source_group
            file_name = File.basename(file_path)
            path_for_group = file_name  # Default to just the filename
            
            # If source group has a path, handle files relative to that path
            if source_group.path && !source_group.path.empty?
              if relative_path.start_with?(source_group.path + File::SEPARATOR)
                # File is within source group directory
                path_within_source = relative_path[(source_group.path.length + 1)..-1]
                dir_path = File.dirname(path_within_source)
                
                # If file is in a subdirectory, navigate to that group
                if dir_path != '.' && !dir_path.empty?
                  target_group = source_group.find_subpath(dir_path, true)
                  path_for_group = file_name
                else
                  # File is directly in source group
                  path_for_group = file_name
                end
              else
                # File is outside source group, use full relative path
                path_for_group = relative_path
              end
            else
              # Source group has no path - parse relative path to find subdirectories
              dir_path = File.dirname(relative_path)
              if dir_path != '.' && !dir_path.empty?
                target_group = source_group.find_subpath(dir_path, true)
                path_for_group = file_name
              else
                path_for_group = file_name
              end
            end
            
            # Add file to the group with just the filename (or appropriate relative path)
            file_ref = target_group.new_file(path_for_group)
            
            # Determine the appropriate build phase based on file extension
            file_ext = File.extname(file_path).downcase
            source_extensions = ['.swift', '.m', '.mm', '.c', '.cpp', '.cc', '.cxx', '.metal']
            resource_extensions = ['.plist', '.xcassets', '.storyboard', '.xib', '.strings', '.stringsdict', '.json', '.xml', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.mp3', '.wav', '.mp4', '.mov']
            
            if source_extensions.include?(file_ext)
              # Add to Sources build phase
              target.source_build_phase.add_file_reference(file_ref)
            elsif resource_extensions.include?(file_ext)
              # Add to Resources build phase
              target.resources_build_phase.add_file_reference(file_ref)
            end
            
            files_added << File.basename(file_path)
          rescue => e
            files_failed << "#{file_path}: #{e.message}"
          end
        end

        # Save the project
        project.save

        result = {
          success: true,
          filesAdded: files_added,
          filesRemoved: files_removed,
          target: target.name,
          message: "Successfully added #{files_added.length} files and removed #{files_removed.length} files"
        }
        
        warnings = []
        if files_failed.any?
          warnings << "Failed to add #{files_failed.length} files: #{files_failed.join(', ')}"
        end
        if files_remove_failed.any?
          warnings << "Failed to remove #{files_remove_failed.length} files: #{files_remove_failed.join(', ')}"
        end
        if warnings.any?
          result[:warnings] = warnings.join('; ')
        end

        puts JSON.generate(result)

      rescue => e
        puts JSON.generate({
          success: false,
          error: e.class.name,
          message: e.message
        })
        exit 1
      end
    `;

    return rubyScript;
  }
}
