/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { Tool } from '../tool.js';
import { FileUtils } from '../../utils/fileUtils.js';
import { CommandRunner } from '../../utils/commandRunner.js';
import { join, dirname, relative } from 'path';
import { z } from 'zod';

const XcodeAddFilesRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  filePattern: z.string().default('**/*.swift'),
  targetName: z.string().optional(),
  dryRun: z.boolean().default(false),
});

const XcodeAddFilesResponse = z.object({
  success: z.boolean(),
  addedFiles: z.array(z.string()).optional(),
  skippedFiles: z.array(z.string()).optional(),
  error: z.string().optional(),
  guidance: z.string().optional(),
});

export type XcodeAddFilesRequestType = z.infer<typeof XcodeAddFilesRequest>;
export type XcodeAddFilesResponseType = z.infer<typeof XcodeAddFilesResponse>;

export class XcodeAddFilesTool implements Tool {
  readonly name = 'Add Files to Xcode Project';
  readonly toolId = 'xcode-add-files';
  readonly description =
    'Automatically adds Swift files (or other source files) to an Xcode project, solving the common issue where LLM-generated files are not included in the build.';
  readonly inputSchema = XcodeAddFilesRequest;
  readonly outputSchema = XcodeAddFilesResponse;

  private async findXcodeProject(projectPath: string): Promise<string | null> {
    // Check if the path is already a .xcodeproj
    if (projectPath.endsWith('.xcodeproj')) {
      if (await FileUtils.exists(projectPath)) {
        return projectPath;
      }
      return null;
    }

    // Look for .xcodeproj in the given directory
    try {
      const files = await FileUtils.readDirectory(projectPath);
      const xcodeProject = files.find(file => file.endsWith('.xcodeproj'));
      if (xcodeProject) {
        return join(projectPath, xcodeProject);
      }
    } catch {
      // Directory might not exist
    }

    return null;
  }

  private async findSwiftFiles(projectPath: string): Promise<string[]> {
    const swiftFiles: string[] = [];
    const projectDir = dirname(projectPath);

    try {
      // Use find command to locate Swift files
      const result = await CommandRunner.run(
        'find',
        [
          projectDir,
          '-name',
          '*.swift',
          '-type',
          'f',
          '!',
          '-path',
          '*/Pods/*',
          '!',
          '-path',
          '*/Build/*',
          '!',
          '-path',
          '*/.build/*',
          '!',
          '-path',
          '*/DerivedData/*',
        ],
        { cwd: projectDir }
      );

      if (result.success && result.stdout) {
        const files = result.stdout.trim().split('\n').filter(Boolean);
        for (const file of files) {
          const relativePath = relative(projectDir, file);
          swiftFiles.push(relativePath);
        }
      }
    } catch (error) {
      console.error('Error finding Swift files:', error);
    }

    return swiftFiles;
  }

  private async getFilesInProject(projectPath: string): Promise<string[]> {
    const pbxprojPath = join(projectPath, 'project.pbxproj');

    try {
      const pbxprojContent = await FileUtils.readFile(pbxprojPath);
      const filesInProject: string[] = [];

      // Parse the pbxproj to find file references
      // This is a simplified approach - we look for file references with .swift extensions
      const lines = pbxprojContent.split('\n');

      for (const line of lines) {
        // Look for PBXFileReference entries with .swift files
        const match = line.match(/\/\*\s*(.+\.swift)\s*\*\//);
        if (match) {
          filesInProject.push(match[1]);
        }
      }

      return filesInProject;
    } catch (error) {
      console.error('Error reading project file:', error);
      return [];
    }
  }

  private async addFilesToProject(
    projectPath: string,
    filesToAdd: string[],
    targetName?: string,
    dryRun: boolean = false
  ): Promise<{ success: boolean; addedFiles: string[]; error?: string }> {
    if (dryRun) {
      return {
        success: true,
        addedFiles: filesToAdd,
      };
    }

    // Check if xcodeproj Ruby gem is available
    try {
      const gemCheck = await CommandRunner.run('ruby', ['-e', 'require "xcodeproj"'], {});
      if (!gemCheck.success) {
        throw new Error('xcodeproj gem not available');
      }
    } catch {
      return {
        success: false,
        addedFiles: [],
        error: 'xcodeproj Ruby gem is not installed. Install with: gem install xcodeproj',
      };
    }

    // Create a Ruby script to add files using xcodeproj gem
    const rubyScript = this.generateRubyScript(projectPath, filesToAdd, targetName);
    const tempScriptPath = join(dirname(projectPath), 'add_files_temp.rb');

    try {
      await FileUtils.writeFile(tempScriptPath, rubyScript);

      const result = await CommandRunner.run('ruby', [tempScriptPath], {
        cwd: dirname(projectPath),
      });

      // Clean up temp script
      try {
        await CommandRunner.run('rm', [tempScriptPath], {});
      } catch {
        // Ignore cleanup errors
      }

      if (result.success) {
        return {
          success: true,
          addedFiles: filesToAdd,
        };
      } else {
        return {
          success: false,
          addedFiles: [],
          error: `Failed to add files: ${result.stderr || result.stdout}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        addedFiles: [],
        error: `Error executing Ruby script: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private generateRubyScript(
    projectPath: string,
    filesToAdd: string[],
    targetName?: string
  ): string {
    return `#!/usr/bin/env ruby

require 'xcodeproj'

project_path = "${projectPath}"
files_to_add = ${JSON.stringify(filesToAdd)}
target_name = ${targetName ? `"${targetName}"` : 'nil'}

begin
  # Open the project
  project = Xcodeproj::Project.open(project_path)
  
  # Find the target (use first target if not specified)
  target = if target_name
    project.targets.find { |t| t.name == target_name }
  else
    project.targets.first
  end
  
  if target.nil?
    puts "Error: Target not found"
    exit 1
  end
  
  project_dir = File.dirname(project_path)
  
  files_to_add.each do |file_path|
    full_file_path = File.join(project_dir, file_path)
    
    # Skip if file doesn't exist
    unless File.exist?(full_file_path)
      puts "Warning: File not found: #{file_path}"
      next
    end
    
    # Check if file is already in project
    existing_file = project.files.find { |f| f.real_path.to_s == full_file_path }
    if existing_file
      puts "Skipping already added file: #{file_path}"
      next
    end
    
    # Find or create the appropriate group based on file path
    group = project.main_group
    path_components = file_path.split('/')[0..-2] # Remove filename
    
    path_components.each do |component|
      existing_group = group.children.find { |child| child.display_name == component }
      if existing_group && existing_group.is_a?(Xcodeproj::Project::Object::PBXGroup)
        group = existing_group
      else
        group = group.new_group(component)
        group.path = component
      end
    end
    
    # Add the file reference
    file_ref = group.new_file(full_file_path)
    file_ref.path = File.basename(file_path)
    
    # Add to target's sources build phase if it's a source file
    if file_path.end_with?('.swift', '.m', '.mm', '.cpp', '.c')
      target.source_build_phase.add_file_reference(file_ref)
    elsif file_path.end_with?('.h')
      target.headers_build_phase.add_file_reference(file_ref) if target.headers_build_phase
    end
    
    puts "Added: #{file_path}"
  end
  
  # Save the project
  project.save
  puts "Project updated successfully"
  
rescue => e
  puts "Error: #{e.message}"
  exit 1
end`;
  }

  private generateGuidance(): string {
    return `# Add Files to Xcode Project Tool

This tool automatically adds Swift files (and other source files) to your Xcode project, solving the common issue where LLM-generated files exist on disk but aren't included in the build.

## Prerequisites

This tool requires the Ruby \`xcodeproj\` gem:

\`\`\`bash
gem install xcodeproj
\`\`\`

## How it works

1. **Scans for source files**: Finds Swift files in your project directory
2. **Checks project status**: Identifies files not yet added to the Xcode project
3. **Adds missing files**: Uses the xcodeproj gem to properly add files to the project
4. **Organizes groups**: Creates appropriate Xcode groups matching your folder structure
5. **Updates build phases**: Adds source files to the compile sources build phase

## Usage Examples

### Add all Swift files to project:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj"
}
\`\`\`

### Add files to specific target:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "targetName": "MyApp"
}
\`\`\`

### Dry run to see what would be added:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "dryRun": true
}
\`\`\`

## File Organization

The tool automatically:
- Creates Xcode groups that mirror your folder structure
- Adds Swift files to the compile sources build phase
- Skips files already in the project
- Ignores Pods, Build, and other generated directories

This is especially useful when working with LLMs that generate Swift files, ensuring they're properly integrated into your Xcode project for successful builds.`;
  }

  private async handleRequest(params: XcodeAddFilesRequestType) {
    try {
      // Find the Xcode project
      const xcodeProjectPath = await this.findXcodeProject(params.projectPath);
      if (!xcodeProjectPath) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `No Xcode project found at: ${params.projectPath}`,
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // If no specific parameters provided, just return guidance
      if (!params.filePattern && !params.targetName && !params.dryRun) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Find all Swift files in the project
      const allSwiftFiles = await this.findSwiftFiles(xcodeProjectPath);

      // Get files already in the project
      const filesInProject = await this.getFilesInProject(xcodeProjectPath);

      // Find files that need to be added
      const filesToAdd = allSwiftFiles.filter(file => {
        const fileName = file.split('/').pop() || '';
        return !filesInProject.some(projectFile => projectFile.includes(fileName));
      });

      if (filesToAdd.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  addedFiles: [],
                  skippedFiles: allSwiftFiles,
                  guidance: 'All Swift files are already included in the Xcode project.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Add files to project
      const result = await this.addFilesToProject(
        xcodeProjectPath,
        filesToAdd,
        params.targetName,
        params.dryRun
      );

      const guidance = params.dryRun
        ? `Dry run completed. Would add ${filesToAdd.length} files to the project.`
        : result.success
          ? `Successfully added ${result.addedFiles.length} files to the Xcode project.`
          : `Failed to add files: ${result.error}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: result.success,
                addedFiles: result.addedFiles,
                skippedFiles: allSwiftFiles.filter(file => !filesToAdd.includes(file)),
                error: result.error,
                guidance,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error adding files to Xcode project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async register(server: McpServer): Promise<void> {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      this.handleRequest.bind(this)
    );
  }
}
