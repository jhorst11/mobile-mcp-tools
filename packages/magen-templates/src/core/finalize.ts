/**
 * Template finalization logic for Magen Template System.
 *
 * Converts authoring instances (concrete, buildable apps) into templates
 * by extracting annotations and rewriting literals to Handlebars.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import {
  parseAnnotations,
  extractDefaultValue,
  rewriteLineWithHandlebars,
  validateAnnotations,
  type VariableAnnotation,
  type FileAnnotations,
} from './annotations.js';
import {
  type TemplateDescriptor,
  type TemplateVariable,
  TemplateDescriptorSchema,
} from './schema.js';

/**
 * Options for template finalization
 */
export interface FinalizeOptions {
  /** Path to the authoring instance (work directory) */
  workDirectory: string;
  /** Path where the template should be written */
  templateDirectory: string;
  /** Template name */
  templateName: string;
  /** Platform (ios, android, etc.) */
  platform: string;
  /** Optional base template this is layered on */
  basedOn?: string;
  /** Template version */
  version: string;
  /** Template description */
  description?: string;
  /** Template tags */
  tags?: string[];
}

/**
 * Result of template finalization
 */
export interface FinalizeResult {
  /** Generated template.json */
  templateDescriptor: TemplateDescriptor;
  /** Files that were renamed due to magen:filename annotations */
  renamedFiles: Map<string, string>; // original -> templated
  /** All variables extracted from annotations */
  variables: TemplateVariable[];
  /** Any warnings or non-fatal issues */
  warnings: string[];
}

/**
 * Finalize a template from an authoring instance.
 *
 * This function:
 * 1. Scans all files in the work directory for annotations
 * 2. Extracts variable schema from annotations
 * 3. Rewrites literals to Handlebars placeholders
 * 4. Renames files based on magen:filename annotations
 * 5. Generates template.json
 */
export function finalizeTemplate(options: FinalizeOptions): FinalizeResult {
  const {
    workDirectory,
    templateDirectory,
    templateName,
    platform,
    basedOn,
    version,
    description,
    tags,
  } = options;

  // Validate work directory exists
  if (!existsSync(workDirectory)) {
    throw new Error(`Work directory not found: ${workDirectory}`);
  }

  // Scan all files and collect annotations
  const fileAnnotations = scanDirectoryForAnnotations(workDirectory);

  // Validate all annotations
  const allErrors: string[] = [];
  for (const [filePath, annotations] of fileAnnotations.entries()) {
    const errors = validateAnnotations(annotations);
    if (errors.length > 0) {
      allErrors.push(`In ${filePath}:`);
      allErrors.push(...errors.map(e => `  ${e}`));
    }
  }

  if (allErrors.length > 0) {
    throw new Error(`Annotation validation failed:\n${allErrors.join('\n')}`);
  }

  // Extract unified schema from all files
  const { variables } = extractUnifiedSchema(workDirectory, fileAnnotations);

  // Create template directory
  const templateOutputDir = join(templateDirectory, 'template');
  mkdirSync(templateOutputDir, { recursive: true });

  // Process files: rewrite literals and handle filename annotations
  const renamedFiles = new Map<string, string>();
  const warnings: string[] = [];

  processFiles(workDirectory, templateOutputDir, fileAnnotations, renamedFiles);

  // Generate template.json
  const templateDescriptor: TemplateDescriptor = {
    name: templateName,
    platform,
    version,
    description,
    tags,
    basedOn,
    variables,
  };

  // Validate the generated descriptor
  const validationResult = TemplateDescriptorSchema.safeParse(templateDescriptor);
  if (!validationResult.success) {
    throw new Error(
      `Generated template.json is invalid: ${validationResult.error.errors.map(e => e.message).join(', ')}`
    );
  }

  // Write template.json
  const templateJsonPath = join(templateDirectory, 'template.json');
  writeFileSync(templateJsonPath, JSON.stringify(templateDescriptor, null, 2));

  return {
    templateDescriptor,
    renamedFiles,
    variables,
    warnings,
  };
}

/**
 * Scan a directory recursively for annotation comments
 */
function scanDirectoryForAnnotations(dirPath: string): Map<string, FileAnnotations> {
  const result = new Map<string, FileAnnotations>();

  function scanDir(currentPath: string) {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip common directories that shouldn't be templated
        if (
          entry === 'node_modules' ||
          entry === '.git' ||
          entry === 'dist' ||
          entry === 'build' ||
          entry === '.magen'
        ) {
          continue;
        }
        scanDir(fullPath);
      } else if (stat.isFile()) {
        // Only scan text files (skip binaries, images, etc.)
        if (shouldScanFile(entry)) {
          const content = readFileSync(fullPath, 'utf-8');
          const annotations = parseAnnotations(content);

          // Only store if file has annotations
          if (
            annotations.variables.length > 0 ||
            annotations.regexRules.length > 0 ||
            annotations.enumRules.length > 0 ||
            annotations.filenameAnnotation
          ) {
            const relativePath = relative(dirPath, fullPath);
            result.set(relativePath, annotations);
          }
        }
      }
    }
  }

  scanDir(dirPath);
  return result;
}

/**
 * Determine if a file should be scanned for annotations
 */
function shouldScanFile(filename: string): boolean {
  const textExtensions = [
    '.swift',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.kt',
    '.java',
    '.m',
    '.h',
    '.xml',
    '.plist',
    '.json',
    '.yaml',
    '.yml',
    '.md',
    '.txt',
  ];

  return textExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Extract unified schema from all file annotations
 */
function extractUnifiedSchema(
  workDirectory: string,
  fileAnnotations: Map<string, FileAnnotations>
): {
  variables: TemplateVariable[];
  regexRules: Map<string, string>;
  enumRules: Map<string, string[]>;
} {
  const variablesMap = new Map<string, TemplateVariable>();
  const regexRules = new Map<string, string>();
  const enumRules = new Map<string, string[]>();

  for (const [filePath, annotations] of fileAnnotations.entries()) {
    const fullPath = join(workDirectory, filePath);
    const fileContent = readFileSync(fullPath, 'utf-8');

    // Process variable annotations
    for (const varAnnotation of annotations.variables) {
      if (variablesMap.has(varAnnotation.name)) {
        // Variable already defined, verify consistency
        const existing = variablesMap.get(varAnnotation.name)!;
        if (existing.type !== varAnnotation.type) {
          throw new Error(
            `Variable ${varAnnotation.name} has conflicting types: ${existing.type} vs ${varAnnotation.type}`
          );
        }
        // Use the one with description if available
        if (!existing.description && varAnnotation.description) {
          variablesMap.set(varAnnotation.name, {
            ...existing,
            description: varAnnotation.description,
          });
        }
      } else {
        // Extract default value
        const defaultValue = extractDefaultValue(varAnnotation, fileContent);

        const variable: TemplateVariable = {
          name: varAnnotation.name,
          type: varAnnotation.type,
          required: varAnnotation.required,
          ...(varAnnotation.description && { description: varAnnotation.description }),
          ...(defaultValue !== undefined && { default: defaultValue }),
        };

        variablesMap.set(varAnnotation.name, variable);
      }
    }

    // Process regex rules
    for (const regexAnnotation of annotations.regexRules) {
      if (regexRules.has(regexAnnotation.name)) {
        const existing = regexRules.get(regexAnnotation.name)!;
        if (existing !== regexAnnotation.pattern) {
          throw new Error(
            `Variable ${regexAnnotation.name} has conflicting regex patterns: ${existing} vs ${regexAnnotation.pattern}`
          );
        }
      } else {
        regexRules.set(regexAnnotation.name, regexAnnotation.pattern);
      }
    }

    // Process enum rules
    for (const enumAnnotation of annotations.enumRules) {
      if (enumRules.has(enumAnnotation.name)) {
        const existing = enumRules.get(enumAnnotation.name)!;
        const existingSet = new Set(existing);
        const newSet = new Set(enumAnnotation.values);

        // Check if they're the same
        if (existingSet.size !== newSet.size || ![...existingSet].every(v => newSet.has(v))) {
          throw new Error(
            `Variable ${enumAnnotation.name} has conflicting enum values: [${existing.join(', ')}] vs [${enumAnnotation.values.join(', ')}]`
          );
        }
      } else {
        enumRules.set(enumAnnotation.name, enumAnnotation.values);
      }
    }
  }

  // Apply regex and enum rules to variables
  const variables = Array.from(variablesMap.values()).map(variable => {
    const enhanced: TemplateVariable = { ...variable };

    if (regexRules.has(variable.name)) {
      enhanced.regex = regexRules.get(variable.name);
    }

    if (enumRules.has(variable.name)) {
      enhanced.enum = enumRules.get(variable.name);
    }

    return enhanced;
  });

  return { variables, regexRules, enumRules };
}

/**
 * Process all files: rewrite literals and handle filename annotations
 */
function processFiles(
  workDirectory: string,
  templateOutputDir: string,
  fileAnnotations: Map<string, FileAnnotations>,
  renamedFiles: Map<string, string>
) {
  function processDir(relativePath: string = '') {
    const sourcePath = join(workDirectory, relativePath);
    const targetPath = join(templateOutputDir, relativePath);

    const entries = readdirSync(sourcePath);

    for (const entry of entries) {
      const relativeEntry = relativePath ? join(relativePath, entry) : entry;
      const sourceFullPath = join(sourcePath, entry);
      const stat = statSync(sourceFullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (
          entry === 'node_modules' ||
          entry === '.git' ||
          entry === 'dist' ||
          entry === 'build' ||
          entry === '.magen'
        ) {
          continue;
        }

        mkdirSync(join(targetPath, entry), { recursive: true });
        processDir(relativeEntry);
      } else if (stat.isFile()) {
        const annotations = fileAnnotations.get(relativeEntry);
        let targetFilename = entry;

        // Check for filename annotation
        if (annotations?.filenameAnnotation) {
          targetFilename = annotations.filenameAnnotation.templatedFilename;
          renamedFiles.set(relativeEntry, join(dirname(relativeEntry), targetFilename));
        }

        const targetFullPath = join(targetPath, targetFilename);

        // Process file content
        if (annotations && shouldScanFile(entry)) {
          const content = readFileSync(sourceFullPath, 'utf-8');
          const rewritten = rewriteFileContent(content, annotations);
          mkdirSync(dirname(targetFullPath), { recursive: true });
          writeFileSync(targetFullPath, rewritten);
        } else {
          // Copy file as-is
          mkdirSync(dirname(targetFullPath), { recursive: true });
          const content = readFileSync(sourceFullPath);
          writeFileSync(targetFullPath, content);
        }
      }
    }
  }

  processDir();
}

/**
 * Rewrite file content to replace literals with Handlebars
 */
function rewriteFileContent(content: string, annotations: FileAnnotations): string {
  const lines = content.split('\n');
  const variablesByLine = new Map<number, VariableAnnotation>();

  // Map variables to their line numbers
  for (const varAnnotation of annotations.variables) {
    variablesByLine.set(varAnnotation.line, varAnnotation);
  }

  // Rewrite lines
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const varAnnotation = variablesByLine.get(lineNumber);

    if (varAnnotation) {
      // Check if this line contains both annotation and assignment (inline)
      const hasAssignment = lines[i].match(/=\s*(.+?)\s*\/\/\s*magen:var/);

      if (hasAssignment) {
        // Inline annotation - rewrite this line
        lines[i] = rewriteLineWithHandlebars(lines[i], varAnnotation.name, varAnnotation.type);
      } else if (i + 1 < lines.length) {
        // Annotation on separate line - rewrite next line
        lines[i + 1] = rewriteLineWithHandlebars(
          lines[i + 1],
          varAnnotation.name,
          varAnnotation.type
        );
      }
    }
  }

  return lines.join('\n');
}
