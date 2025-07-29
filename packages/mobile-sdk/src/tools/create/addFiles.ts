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
import { BuildManager } from '../../utils/buildManager.js';
import { join, dirname, relative } from 'path';
import { z } from 'zod';

const AddFilesRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  filePaths: z
    .array(z.string())
    .optional()
    .describe('Specific file paths to add (relative to project directory)'),
  autoDiscoverFiles: z
    .boolean()
    .default(false)
    .describe('Auto-discover all source files (not recommended)'),
  targetName: z.string().optional().describe('Target name (iOS only)'),
  dryRun: z.boolean().default(false),
});

const AddFilesResponse = z.object({
  success: z.boolean(),
  platform: z.string().optional(),
  addedFiles: z.array(z.string()).optional(),
  skippedFiles: z.array(z.string()).optional(),
  error: z.string().optional(),
  guidance: z.string().optional(),
});

export type AddFilesRequestType = z.infer<typeof AddFilesRequest>;
export type AddFilesResponseType = z.infer<typeof AddFilesResponse>;

export class CreateAddFilesTool implements Tool {
  readonly name = 'Add Files';
  readonly toolId = 'create-add-files';
  readonly description =
    'Adds specified source files to the project build system. For iOS projects, integrates files into Xcode. For Android/React Native, ensures files are in correct locations.';
  readonly inputSchema = AddFilesRequest;
  readonly outputSchema = AddFilesResponse;

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

  private generatePlatformGuidance(): string {
    return `# Add Files Tool

This tool adds source files to your project build system and is platform-aware:

## iOS Projects
- Automatically integrates files into Xcode project
- Creates appropriate Xcode groups
- Adds to compile sources build phase
- Requires Ruby xcodeproj gem: \`gem install xcodeproj\`

## Android Projects  
- Ensures files are in correct source directories
- Files are automatically picked up by Gradle build system

## React Native Projects
- Handles both native modules and JavaScript files
- Platform-specific integration as needed

Specify exact file paths for best results:
\`\`\`json
{
  "projectPath": "/path/to/project",
  "filePaths": ["src/MyComponent.swift", "src/MyHelper.kt"]
}
\`\`\`
`;
  }

  private generateGuidance(): string {
    return `# Add Files to Xcode Project Tool

This tool adds specified Swift files (and other source files) to your Xcode project, solving the common issue where LLM-generated files exist on disk but aren't included in the build.

## Prerequisites

This tool requires the Ruby \`xcodeproj\` gem:

\`\`\`bash
gem install xcodeproj
\`\`\`

## How it works

1. **Validates specified files**: Ensures the files you want to add actually exist
2. **Checks project status**: Identifies which files are not yet in the Xcode project
3. **Adds missing files**: Uses the xcodeproj gem to properly add files to the project
4. **Organizes groups**: Creates appropriate Xcode groups matching your folder structure
5. **Updates build phases**: Adds source files to the compile sources build phase

## Recommended Usage - Specify Exact Files

### Add specific files (recommended):
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "filePaths": [
    "ContactsApp/Models/Contact.swift",
    "ContactsApp/Views/ContactListView.swift",
    "ContactsApp/Controllers/ContactDetailViewController.swift"
  ]
}
\`\`\`

### Add files to specific target:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "filePaths": ["ContactsApp/Models/Contact.swift"],
  "targetName": "ContactsApp"
}
\`\`\`

### Dry run to see what would be added:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "filePaths": ["ContactsApp/Models/Contact.swift"],
  "dryRun": true
}
\`\`\`

## Legacy Auto-Discovery (Not Recommended)

### Auto-discover all Swift files:
\`\`\`json
{
  "projectPath": "/path/to/MyApp.xcodeproj",
  "autoDiscoverSwift": true
}
\`\`\`

**⚠️ Warning**: Auto-discovery may include framework test files or other unwanted files. Explicit file specification is recommended.

## File Organization

The tool automatically:
- Creates Xcode groups that mirror your folder structure
- Adds Swift files to the compile sources build phase
- Skips files already in the project
- Only adds the files you explicitly specify (when using filePaths)

This is especially useful when working with LLMs that generate specific Swift files, ensuring they're properly integrated into your Xcode project for successful builds while maintaining complete control over what gets added.`;
  }

  private async handleRequest(params: AddFilesRequestType) {
    try {
      // Detect platform
      const platform = await BuildManager.detectPlatform(params.projectPath);

      if (!platform) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Could not detect project platform at: ${params.projectPath}`,
                  guidance: this.generatePlatformGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Handle platform-specific logic
      if (platform === 'ios') {
        return await this.handleIOSProject(params);
      } else if (platform === 'android') {
        return await this.handleAndroidProject(params);
      } else if (platform === 'react-native') {
        return await this.handleReactNativeProject(params);
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  platform,
                  error: `Platform '${platform}' not supported for file addition`,
                  guidance: this.generatePlatformGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error adding files to project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async handleIOSProject(params: AddFilesRequestType) {
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
      if (!params.filePaths && !params.autoDiscoverFiles && !params.targetName && !params.dryRun) {
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

      let filesToAdd: string[] = [];
      const projectDir = dirname(xcodeProjectPath);

      if (params.filePaths && params.filePaths.length > 0) {
        // Use explicitly specified file paths
        const validFiles: string[] = [];
        const missingFiles: string[] = [];

        for (const filePath of params.filePaths) {
          const fullPath = join(projectDir, filePath);
          if (await FileUtils.exists(fullPath)) {
            validFiles.push(filePath);
          } else {
            missingFiles.push(filePath);
          }
        }

        if (missingFiles.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Files not found: ${missingFiles.join(', ')}`,
                    guidance:
                      'Please check that the file paths are correct and relative to the project directory.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        filesToAdd = validFiles;
      } else if (params.autoDiscoverFiles) {
        // Auto-discover Swift files (legacy behavior)
        const allSwiftFiles = await this.findSwiftFiles(xcodeProjectPath);

        // Get files already in the project
        const filesInProject = await this.getFilesInProject(xcodeProjectPath);

        // Find files that need to be added
        filesToAdd = allSwiftFiles.filter(file => {
          const fileName = file.split('/').pop() || '';
          return !filesInProject.some(projectFile => projectFile.includes(fileName));
        });
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Please specify either filePaths (recommended) or set autoDiscoverSwift=true.',
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (filesToAdd.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  addedFiles: [],
                  skippedFiles: [],
                  guidance: params.filePaths
                    ? 'All specified files are already included in the Xcode project.'
                    : 'No new Swift files found to add.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Get files already in the project to determine which need to be added
      const filesInProject = await this.getFilesInProject(xcodeProjectPath);
      const actualFilesToAdd = filesToAdd.filter(file => {
        const fileName = file.split('/').pop() || '';
        return !filesInProject.some(projectFile => projectFile.includes(fileName));
      });

      const alreadyInProject = filesToAdd.filter(file => !actualFilesToAdd.includes(file));

      // Add files to project
      const result = await this.addFilesToProject(
        xcodeProjectPath,
        actualFilesToAdd,
        params.targetName,
        params.dryRun
      );

      const guidance = params.dryRun
        ? `Dry run completed. Would add ${actualFilesToAdd.length} files to the project.${alreadyInProject.length > 0 ? ` ${alreadyInProject.length} files already in project.` : ''}`
        : result.success
          ? `Successfully added ${result.addedFiles.length} files to the Xcode project.${alreadyInProject.length > 0 ? ` ${alreadyInProject.length} files were already in the project.` : ''}`
          : `Failed to add files: ${result.error}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: result.success,
                addedFiles: result.addedFiles,
                skippedFiles: alreadyInProject,
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

  private async handleAndroidProject(params: AddFilesRequestType) {
    // For Android projects, files are typically auto-discovered by Gradle
    // We just need to ensure files are in the correct source directories

    if (!params.filePaths || params.filePaths.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform: 'android',
                guidance: `Android projects automatically discover source files. Ensure your files are in the correct directories:
- Java/Kotlin: app/src/main/java/com/yourpackage/
- Resources: app/src/main/res/
- Assets: app/src/main/assets/

No manual file registration required for Android projects.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Validate that files exist and are in correct locations
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];

    for (const filePath of params.filePaths) {
      const fullPath = join(params.projectPath, filePath);
      if (await FileUtils.exists(fullPath)) {
        validFiles.push(filePath);
      } else {
        invalidFiles.push(filePath);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: invalidFiles.length === 0,
              platform: 'android',
              addedFiles: validFiles,
              skippedFiles: invalidFiles,
              guidance: `Android files validated. ${validFiles.length} files found. Gradle will automatically include them in the build.`,
              error:
                invalidFiles.length > 0 ? `Files not found: ${invalidFiles.join(', ')}` : undefined,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleReactNativeProject(params: AddFilesRequestType) {
    // React Native projects may need platform-specific handling

    if (!params.filePaths || params.filePaths.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform: 'react-native',
                guidance: `React Native projects structure:
- JavaScript/TypeScript: src/ or root directory
- iOS native: ios/ directory (handled like iOS project)
- Android native: android/ directory (handled like Android project)

For native modules, ensure files are in platform-specific directories.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Basic validation for React Native
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];

    for (const filePath of params.filePaths) {
      const fullPath = join(params.projectPath, filePath);
      if (await FileUtils.exists(fullPath)) {
        validFiles.push(filePath);
      } else {
        invalidFiles.push(filePath);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: invalidFiles.length === 0,
              platform: 'react-native',
              addedFiles: validFiles,
              skippedFiles: invalidFiles,
              guidance: `React Native files validated. ${validFiles.length} files found. JavaScript/TypeScript files are automatically included. Native files should be in ios/ or android/ subdirectories.`,
              error:
                invalidFiles.length > 0 ? `Files not found: ${invalidFiles.join(', ')}` : undefined,
            },
            null,
            2
          ),
        },
      ],
    };
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
