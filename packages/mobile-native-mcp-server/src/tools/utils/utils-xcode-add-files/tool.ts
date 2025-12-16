/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// TODO: This tool needs further consideration for our server tool design pattern. It's basically
// wired up to the data structures, but has no LLM exeuction prompt and is in need of
// consideration for how that should be implemented.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import * as path from 'path';
import {
  Logger,
  FileSystemOperations,
  NodeFileSystemOperations,
} from '@salesforce/magen-mcp-workflow';
import { XCODE_ADD_FILES_TOOL, XcodeAddFilesWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

interface XcodeAddFilesResult {
  success: boolean;
  command: string;
  projectPath: string;
  filePaths?: string[];
  filesRemoved?: string[];
  targetName?: string;
  message: string;
  error?: string;
}

export class UtilsXcodeAddFilesTool extends AbstractNativeProjectManagerTool<
  typeof XCODE_ADD_FILES_TOOL
> {
  private readonly fs: FileSystemOperations;

  constructor(
    server: McpServer,
    logger?: Logger,
    fileSystemOperations: FileSystemOperations = new NodeFileSystemOperations()
  ) {
    super(server, XCODE_ADD_FILES_TOOL, 'XcodeAddFilesTool', logger);
    this.fs = fileSystemOperations;
  }

  public handleRequest = async (input: XcodeAddFilesWorkflowInput) => {
    try {
      const result = await this.addFilesToXcodeProject(input);

      // Validate the result against the output schema
      const validatedResult = this.toolMetadata.resultSchema.parse(result);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(validatedResult, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResult: XcodeAddFilesResult = {
        success: false,
        command: '',
        projectPath: '',
        filePaths: [],
        message: 'Failed to generate command for adding files to Xcode project',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      // Validate the error result against the output schema
      const validatedErrorResult = this.toolMetadata.resultSchema.parse(errorResult);

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(validatedErrorResult, null, 2),
          },
        ],
      };
    }
  };

  private async addFilesToXcodeProject(
    input: XcodeAddFilesWorkflowInput
  ): Promise<XcodeAddFilesResult> {
    const { projectPath, xcodeProjectPath, newFilePaths, filesToRemove, targetName } = input;

    // Construct full path to xcodeproj file
    const fullXcodeProjectPath = path.resolve(projectPath, xcodeProjectPath);
    const pbxprojPath = path.join(fullXcodeProjectPath, 'project.pbxproj');

    // Validate inputs
    if (!this.fs.existsSync(pbxprojPath)) {
      throw new Error(`Project file not found: ${pbxprojPath}`);
    }

    // Prepare arguments
    const absoluteFilePaths = (newFilePaths || []).map(filePath =>
      path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath)
    );
    const absoluteFilesToRemove = (filesToRemove || []).map(filePath =>
      path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath)
    );

    // Build the inline Ruby command using xcodeproj gem
    const rubyCode = this.buildInlineRubyCode(
      fullXcodeProjectPath,
      targetName,
      absoluteFilePaths,
      absoluteFilesToRemove
    );
    const command = `ruby -e "${rubyCode}"`;

    const addCount = absoluteFilePaths.length;
    const removeCount = absoluteFilesToRemove.length;
    let message = '';
    if (addCount > 0 && removeCount > 0) {
      message = `Generated command to add ${addCount} files and remove ${removeCount} files from Xcode project`;
    } else if (addCount > 0) {
      message = `Generated command to add ${addCount} files to Xcode project`;
    } else if (removeCount > 0) {
      message = `Generated command to remove ${removeCount} files from Xcode project`;
    } else {
      message = 'No files to add or remove';
    }

    return {
      success: true,
      command,
      projectPath: fullXcodeProjectPath,
      filePaths: absoluteFilePaths.length > 0 ? absoluteFilePaths : undefined,
      filesRemoved: absoluteFilesToRemove.length > 0 ? absoluteFilesToRemove : undefined,
      targetName,
      message,
    };
  }

  private buildInlineRubyCode(
    projectPath: string,
    targetName: string | undefined,
    filePaths: string[],
    filesToRemove: string[] = []
  ): string {
    // Escape strings for shell
    const escapeForShell = (str: string) => str.replace(/"/g, '\\"').replace(/'/g, "\\'");

    const escapedProjectPath = escapeForShell(projectPath);
    const escapedTargetName = targetName ? `'${escapeForShell(targetName)}'` : 'nil';
    const escapedFilePaths = filePaths.map(fp => `'${escapeForShell(fp)}'`).join(', ');
    const escapedFilesToRemove = filesToRemove.map(fp => `'${escapeForShell(fp)}'`).join(', ');

    return dedent`
      require 'xcodeproj'
      require 'json'
      require 'pathname'

      begin
        project_path = '${escapedProjectPath}'
        target_name = ${escapedTargetName}
        files_to_add = [${escapedFilePaths}]
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

        # Find the source group (typically the project name group, not main_group)
        # main_group contains: source group (project name), Products, etc.
        # We want to add files to the source group, not main_group
        source_group = project.main_group.children.find { |child| 
          child.is_a?(Xcodeproj::Project::Object::PBXGroup) && 
          child != project.products_group &&
          child.path != nil &&
          !child.path.empty?
        }
        
        # Fallback: if no source group found, use main_group (shouldn't happen in normal projects)
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
            
            # Find the file reference in the project
            # Need to search recursively through all groups
            file_ref = nil
            project.main_group.recursive_children.each do |child|
              if child.is_a?(Xcodeproj::Project::Object::PBXFileReference) && child.path == relative_path
                file_ref = child
                break
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
              # File reference not found - might already be removed or never existed
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
            
            # If source group has a path, we need to handle files relative to that path
            if source_group.path && !source_group.path.empty?
              # Check if the file is within the source group's directory
              if relative_path.start_with?(source_group.path + File::SEPARATOR)
                # File is within source group directory
                # Remove the source group path prefix to get the path relative to source group
                path_within_source = relative_path[(source_group.path.length + 1)..-1]
                
                # Get directory components (excluding filename)
                dir_path = File.dirname(path_within_source)
                
                # If file is in a subdirectory (not at root of source group)
                if dir_path != '.' && !dir_path.empty?
                  # Find or create the group hierarchy using find_subpath
                  # This automatically creates groups if they don't exist
                  target_group = source_group.find_subpath(dir_path, true)
                end
                # If dir_path is '.' or empty, file is at root of source group, so use source_group
              else
                # File is not within source group directory - this shouldn't happen normally
                # but we'll add it to source_group anyway
                target_group = source_group
              end
            else
              # Source group has no path, so we need to parse the relative path
              # This is a fallback case
              dir_path = File.dirname(relative_path)
              if dir_path != '.' && !dir_path.empty?
                target_group = source_group.find_subpath(dir_path, true)
              end
            end
            
            # Add file to the correct group using new_file
            # new_file creates a file reference with the relative path and adds it to the group
            # The path should be relative to the project directory
            # Note: new_file expects path relative to project root, and handles group hierarchy automatically
            file_ref = target_group.new_file(relative_path)
            
            file_ext = File.extname(file_path).downcase
            source_extensions = ['.swift', '.m', '.mm', '.c', '.cpp', '.cc', '.cxx']
            
            if source_extensions.include?(file_ext)
              target.source_build_phase.add_file_reference(file_ref)
            end
            
            files_added << File.basename(file_path)
          rescue => e
            files_failed << "#{file_path}: #{e.message}"
          end
        end

        project.save

        result = {
          success: true,
          filesAdded: files_added,
          filesRemoved: files_removed,
          target: target.name,
          buildStatus: 'completed',
          message: "Successfully added #{files_added.length} files and removed #{files_removed.length} files from Xcode project",
          sourceGroupPath: source_group.path,
          sourceGroupName: source_group.name
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
  }
}
