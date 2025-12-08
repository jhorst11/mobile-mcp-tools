/**
 * Inline annotation parser for Magen Template System.
 *
 * Supports:
 * - magen:var <name> <type> [required|optional] ["description"]
 * - magen:regex <name> "<pattern>"
 * - magen:enum <name> <value1> <value2> ...
 * - magen:filename <templatedName>
 */

// Annotation parser - no dependencies needed

/**
 * Represents a parsed magen:var annotation
 */
export interface VariableAnnotation {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description?: string;
  default?: string | number | boolean;
  line: number;
  originalLine: string;
}

/**
 * Represents a parsed magen:regex annotation
 */
export interface RegexAnnotation {
  name: string;
  pattern: string;
  line: number;
}

/**
 * Represents a parsed magen:enum annotation
 */
export interface EnumAnnotation {
  name: string;
  values: string[];
  line: number;
}

/**
 * Represents a parsed magen:filename annotation
 */
export interface FilenameAnnotation {
  templatedFilename: string;
  line: number;
}

/**
 * Container for all annotations found in a file
 */
export interface FileAnnotations {
  variables: VariableAnnotation[];
  regexRules: RegexAnnotation[];
  enumRules: EnumAnnotation[];
  filenameAnnotation?: FilenameAnnotation;
}

/**
 * Result of parsing and extracting from authoring instance
 */
export interface ExtractionResult {
  variables: VariableAnnotation[];
  regexRules: Map<string, string>; // varName -> pattern
  enumRules: Map<string, string[]>; // varName -> allowed values
  filenameMapping: Map<string, string>; // originalPath -> templatedPath
  errors: string[];
}

/**
 * Parse magen:var annotation
 * Format: // magen:var <name> <type> [required|optional] ["description"]
 */
function parseVarAnnotation(line: string, lineNumber: number): VariableAnnotation | null {
  // Match: // magen:var appName string required "Display name"
  const match = line.match(
    /\/\/\s*magen:var\s+(\w+)\s+(string|number|boolean)\s+(required|optional)(?:\s+"([^"]+)")?/
  );

  if (!match) {
    return null;
  }

  const [, name, type, requiredStr, description] = match;

  return {
    name,
    type: type as 'string' | 'number' | 'boolean',
    required: requiredStr === 'required',
    description,
    line: lineNumber,
    originalLine: line,
  };
}

/**
 * Parse magen:regex annotation
 * Format: // magen:regex <name> "<pattern>"
 */
function parseRegexAnnotation(line: string, lineNumber: number): RegexAnnotation | null {
  const match = line.match(/\/\/\s*magen:regex\s+(\w+)\s+"([^"]+)"/);

  if (!match) {
    return null;
  }

  const [, name, pattern] = match;

  return {
    name,
    pattern,
    line: lineNumber,
  };
}

/**
 * Parse magen:enum annotation
 * Format: // magen:enum <name> <value1> <value2> ...
 */
function parseEnumAnnotation(line: string, lineNumber: number): EnumAnnotation | null {
  const match = line.match(/\/\/\s*magen:enum\s+(\w+)\s+(.+)/);

  if (!match) {
    return null;
  }

  const [, name, valuesStr] = match;
  const values = valuesStr.trim().split(/\s+/);

  return {
    name,
    values,
    line: lineNumber,
  };
}

/**
 * Parse magen:filename annotation
 * Format: // magen:filename {{appName}}App.swift
 */
function parseFilenameAnnotation(line: string, lineNumber: number): FilenameAnnotation | null {
  const match = line.match(/\/\/\s*magen:filename\s+(.+)/);

  if (!match) {
    return null;
  }

  const [, templatedFilename] = match;

  return {
    templatedFilename: templatedFilename.trim(),
    line: lineNumber,
  };
}

/**
 * Parse all annotations from file content
 */
export function parseAnnotations(content: string): FileAnnotations {
  const lines = content.split('\n');
  const variables: VariableAnnotation[] = [];
  const regexRules: RegexAnnotation[] = [];
  const enumRules: EnumAnnotation[] = [];
  let filenameAnnotation: FilenameAnnotation | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Try parsing each annotation type
    const varAnnotation = parseVarAnnotation(line, lineNumber);
    if (varAnnotation) {
      variables.push(varAnnotation);
      continue;
    }

    const regexAnnotation = parseRegexAnnotation(line, lineNumber);
    if (regexAnnotation) {
      regexRules.push(regexAnnotation);
      continue;
    }

    const enumAnnotation = parseEnumAnnotation(line, lineNumber);
    if (enumAnnotation) {
      enumRules.push(enumAnnotation);
      continue;
    }

    const filenameAnn = parseFilenameAnnotation(line, lineNumber);
    if (filenameAnn) {
      if (filenameAnnotation) {
        throw new Error(
          `Multiple magen:filename annotations found (lines ${filenameAnnotation.line} and ${lineNumber})`
        );
      }
      filenameAnnotation = filenameAnn;
    }
  }

  return {
    variables,
    regexRules,
    enumRules,
    filenameAnnotation,
  };
}

/**
 * Extract default value from the line following a magen:var annotation
 * Looks for patterns like:
 * - let appName = "Magen Demo"
 * - let count = 42
 * - let enabled = true
 */
export function extractDefaultValue(
  varAnnotation: VariableAnnotation,
  fileContent: string
): string | number | boolean | undefined {
  const lines = fileContent.split('\n');
  const annotationLine = lines[varAnnotation.line - 1];

  // Check if annotation is inline (same line as assignment)
  const inlineMatch = annotationLine.match(/=\s*(.+?)\s*\/\/\s*magen:var/);
  if (inlineMatch) {
    return parseDefaultValue(inlineMatch[1], varAnnotation.type);
  }

  // Check next line for assignment
  if (varAnnotation.line < lines.length) {
    const nextLine = lines[varAnnotation.line];
    const assignmentMatch = nextLine.match(
      new RegExp(`\\b${varAnnotation.name}\\s*=\\s*(.+?)(?:\\/\\/|$)`)
    );
    if (assignmentMatch) {
      return parseDefaultValue(assignmentMatch[1], varAnnotation.type);
    }
  }

  return undefined;
}

/**
 * Parse a default value string based on expected type
 */
function parseDefaultValue(
  valueStr: string,
  type: 'string' | 'number' | 'boolean'
): string | number | boolean | undefined {
  const trimmed = valueStr.trim();

  switch (type) {
    case 'string': {
      // Extract string from quotes
      const stringMatch = trimmed.match(/^["'](.*)["']$/);
      return stringMatch ? stringMatch[1] : undefined;
    }
    case 'number': {
      const num = parseFloat(trimmed);
      return isNaN(num) ? undefined : num;
    }
    case 'boolean': {
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Rewrite a line containing a default value to use Handlebars
 */
export function rewriteLineWithHandlebars(
  line: string,
  varName: string,
  varType: 'string' | 'number' | 'boolean'
): string {
  // Handle inline annotation: let appName = "Magen Demo" // magen:var ...
  const inlineMatch = line.match(/^(.+=\s*)(.+?)(\s*\/\/\s*magen:var.*)$/);
  if (inlineMatch) {
    const [, prefix, , suffix] = inlineMatch;
    return `${prefix}${getHandlebarsPlaceholder(varName, varType)}${suffix}`;
  }

  // Handle regular assignment: let appName = "Magen Demo"
  const assignmentMatch = line.match(
    new RegExp(`^(.*\\b${varName}\\s*=\\s*)(.+?)(\\s*(?:\\/\\/.*)?$)`)
  );
  if (assignmentMatch) {
    const [, prefix, , suffix] = assignmentMatch;
    return `${prefix}${getHandlebarsPlaceholder(varName, varType)}${suffix}`;
  }

  return line;
}

/**
 * Get Handlebars placeholder for a variable
 */
function getHandlebarsPlaceholder(
  varName: string,
  varType: 'string' | 'number' | 'boolean'
): string {
  if (varType === 'string') {
    return `"{{${varName}}}"`;
  }
  return `{{${varName}}}`;
}

/**
 * Validate annotations for conflicts and consistency
 */
export function validateAnnotations(annotations: FileAnnotations): string[] {
  const errors: string[] = [];
  const varNames = new Set<string>();

  // Check for duplicate variable names
  for (const varAnnotation of annotations.variables) {
    if (varNames.has(varAnnotation.name)) {
      errors.push(
        `Duplicate variable definition: ${varAnnotation.name} (line ${varAnnotation.line})`
      );
    }
    varNames.add(varAnnotation.name);
  }

  // Check that regex/enum rules reference defined variables
  for (const regexRule of annotations.regexRules) {
    if (!varNames.has(regexRule.name)) {
      errors.push(
        `magen:regex references undefined variable: ${regexRule.name} (line ${regexRule.line})`
      );
    }
  }

  for (const enumRule of annotations.enumRules) {
    if (!varNames.has(enumRule.name)) {
      errors.push(
        `magen:enum references undefined variable: ${enumRule.name} (line ${enumRule.line})`
      );
    }
  }

  // Validate regex patterns
  for (const regexRule of annotations.regexRules) {
    try {
      new RegExp(regexRule.pattern);
    } catch (_e) {
      errors.push(
        `Invalid regex pattern for ${regexRule.name}: ${regexRule.pattern} (line ${regexRule.line})`
      );
    }
  }

  // Validate enum has at least one value
  for (const enumRule of annotations.enumRules) {
    if (enumRule.values.length === 0) {
      errors.push(`magen:enum for ${enumRule.name} has no values (line ${enumRule.line})`);
    }
  }

  return errors;
}
