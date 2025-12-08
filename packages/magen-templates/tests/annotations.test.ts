import { describe, it, expect } from 'vitest';
import {
  parseAnnotations,
  extractDefaultValue,
  rewriteLineWithHandlebars,
  validateAnnotations,
  type VariableAnnotation,
  type FileAnnotations,
} from '../src/core/annotations.js';

describe('Annotation Parser', () => {
  describe('parseAnnotations', () => {
    it('should parse magen:var annotation', () => {
      const content = `
// magen:var appName string required "Display name shown on the home screen"
let appName = "MagenDemo"
`;

      const result = parseAnnotations(content);

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0]).toMatchObject({
        name: 'appName',
        type: 'string',
        required: true,
        description: 'Display name shown on the home screen',
      });
    });

    it('should parse optional variable', () => {
      const content = '// magen:var debugMode boolean optional "Enable debug logging"';

      const result = parseAnnotations(content);

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].required).toBe(false);
    });

    it('should parse variable without description', () => {
      const content = '// magen:var count number required';

      const result = parseAnnotations(content);

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0]).toMatchObject({
        name: 'count',
        type: 'number',
        required: true,
      });
      expect(result.variables[0].description).toBeUndefined();
    });

    it('should parse magen:regex annotation', () => {
      const content = '// magen:regex orgId "^[0-9A-Za-z]+$"';

      const result = parseAnnotations(content);

      expect(result.regexRules).toHaveLength(1);
      expect(result.regexRules[0]).toMatchObject({
        name: 'orgId',
        pattern: '^[0-9A-Za-z]+$',
      });
    });

    it('should parse magen:enum annotation', () => {
      const content = '// magen:enum environment dev staging prod';

      const result = parseAnnotations(content);

      expect(result.enumRules).toHaveLength(1);
      expect(result.enumRules[0]).toMatchObject({
        name: 'environment',
        values: ['dev', 'staging', 'prod'],
      });
    });

    it('should parse magen:filename annotation', () => {
      const content = '// magen:filename {{appName}}App.swift';

      const result = parseAnnotations(content);

      expect(result.filenameAnnotation).toBeDefined();
      expect(result.filenameAnnotation!.templatedFilename).toBe('{{appName}}App.swift');
    });

    it('should parse multiple annotations in one file', () => {
      const content = `
// magen:var appName string required "App name"
// magen:var count number optional
// magen:regex appName "^[A-Z][a-zA-Z0-9]*$"
// magen:enum platform ios android web
// magen:filename {{appName}}Config.swift
`;

      const result = parseAnnotations(content);

      expect(result.variables).toHaveLength(2);
      expect(result.regexRules).toHaveLength(1);
      expect(result.enumRules).toHaveLength(1);
      expect(result.filenameAnnotation).toBeDefined();
    });

    it('should throw error for multiple filename annotations', () => {
      const content = `
// magen:filename FirstFile.swift
// magen:filename SecondFile.swift
`;

      expect(() => parseAnnotations(content)).toThrow('Multiple magen:filename annotations');
    });

    it('should ignore non-annotation comments', () => {
      const content = `
// This is a regular comment
// TODO: implement this
// magen:var realVar string required
// Some other comment
`;

      const result = parseAnnotations(content);

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe('realVar');
    });
  });

  describe('extractDefaultValue', () => {
    it('should extract string default from inline annotation', () => {
      const content = 'let appName = "MagenDemo" // magen:var appName string required';
      const varAnnotation: VariableAnnotation = {
        name: 'appName',
        type: 'string',
        required: true,
        line: 1,
        originalLine: content,
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBe('MagenDemo');
    });

    it('should extract string default from next line', () => {
      const content = `// magen:var appName string required
let appName = "MagenDemo"`;

      const varAnnotation: VariableAnnotation = {
        name: 'appName',
        type: 'string',
        required: true,
        line: 1,
        originalLine: '// magen:var appName string required',
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBe('MagenDemo');
    });

    it('should extract number default', () => {
      const content = `// magen:var maxRetries number required
let maxRetries = 42`;

      const varAnnotation: VariableAnnotation = {
        name: 'maxRetries',
        type: 'number',
        required: true,
        line: 1,
        originalLine: '// magen:var maxRetries number required',
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBe(42);
    });

    it('should extract boolean default', () => {
      const content = `// magen:var debugMode boolean optional
let debugMode = true`;

      const varAnnotation: VariableAnnotation = {
        name: 'debugMode',
        type: 'boolean',
        required: false,
        line: 1,
        originalLine: '// magen:var debugMode boolean optional',
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBe(true);
    });

    it('should return undefined if no default found', () => {
      const content = '// magen:var appName string required';

      const varAnnotation: VariableAnnotation = {
        name: 'appName',
        type: 'string',
        required: true,
        line: 1,
        originalLine: content,
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBeUndefined();
    });

    it('should extract default with single quotes', () => {
      const content = "let appName = 'MagenDemo' // magen:var appName string required";

      const varAnnotation: VariableAnnotation = {
        name: 'appName',
        type: 'string',
        required: true,
        line: 1,
        originalLine: content,
      };

      const defaultValue = extractDefaultValue(varAnnotation, content);

      expect(defaultValue).toBe('MagenDemo');
    });
  });

  describe('rewriteLineWithHandlebars', () => {
    it('should rewrite string value to Handlebars (inline annotation)', () => {
      const line = 'let appName = "MagenDemo" // magen:var appName string required';
      const result = rewriteLineWithHandlebars(line, 'appName', 'string');

      expect(result).toBe('let appName = "{{appName}}" // magen:var appName string required');
    });

    it('should rewrite string value to Handlebars (regular assignment)', () => {
      const line = 'let appName = "MagenDemo"';
      const result = rewriteLineWithHandlebars(line, 'appName', 'string');

      expect(result).toBe('let appName = "{{appName}}"');
    });

    it('should rewrite number value to Handlebars', () => {
      const line = 'let maxRetries = 42';
      const result = rewriteLineWithHandlebars(line, 'maxRetries', 'number');

      expect(result).toBe('let maxRetries = {{maxRetries}}');
    });

    it('should rewrite boolean value to Handlebars', () => {
      const line = 'let debugMode = true';
      const result = rewriteLineWithHandlebars(line, 'debugMode', 'boolean');

      expect(result).toBe('let debugMode = {{debugMode}}');
    });

    it('should preserve trailing comments', () => {
      const line = 'let appName = "MagenDemo" // some comment';
      const result = rewriteLineWithHandlebars(line, 'appName', 'string');

      expect(result).toBe('let appName = "{{appName}}" // some comment');
    });

    it('should handle Swift const declarations', () => {
      const line = 'const appName = "MagenDemo"';
      const result = rewriteLineWithHandlebars(line, 'appName', 'string');

      expect(result).toBe('const appName = "{{appName}}"');
    });
  });

  describe('validateAnnotations', () => {
    it('should pass validation for valid annotations', () => {
      const annotations: FileAnnotations = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            line: 1,
            originalLine: '// magen:var appName string required',
          },
        ],
        regexRules: [{ name: 'appName', pattern: '^[A-Z].*', line: 2 }],
        enumRules: [],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(0);
    });

    it('should detect duplicate variable names', () => {
      const annotations: FileAnnotations = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            line: 1,
            originalLine: '// magen:var appName string required',
          },
          {
            name: 'appName',
            type: 'string',
            required: false,
            line: 5,
            originalLine: '// magen:var appName string optional',
          },
        ],
        regexRules: [],
        enumRules: [],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate variable definition: appName');
    });

    it('should detect regex referencing undefined variable', () => {
      const annotations: FileAnnotations = {
        variables: [],
        regexRules: [{ name: 'undefinedVar', pattern: '^[A-Z].*', line: 1 }],
        enumRules: [],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('magen:regex references undefined variable: undefinedVar');
    });

    it('should detect enum referencing undefined variable', () => {
      const annotations: FileAnnotations = {
        variables: [],
        regexRules: [],
        enumRules: [{ name: 'undefinedVar', values: ['a', 'b'], line: 1 }],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('magen:enum references undefined variable: undefinedVar');
    });

    it('should detect invalid regex pattern', () => {
      const annotations: FileAnnotations = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            line: 1,
            originalLine: '// magen:var appName string required',
          },
        ],
        regexRules: [{ name: 'appName', pattern: '[invalid(regex', line: 2 }],
        enumRules: [],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid regex pattern');
    });

    it('should detect enum with no values', () => {
      const annotations: FileAnnotations = {
        variables: [
          {
            name: 'env',
            type: 'string',
            required: true,
            line: 1,
            originalLine: '// magen:var env string required',
          },
        ],
        regexRules: [],
        enumRules: [{ name: 'env', values: [], line: 2 }],
      };

      const errors = validateAnnotations(annotations);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('has no values');
    });

    it('should return multiple errors when multiple issues exist', () => {
      const annotations: FileAnnotations = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            line: 1,
            originalLine: '// magen:var appName string required',
          },
          {
            name: 'appName',
            type: 'string',
            required: false,
            line: 5,
            originalLine: '// magen:var appName string optional',
          },
        ],
        regexRules: [{ name: 'undefinedVar', pattern: '^test', line: 3 }],
        enumRules: [{ name: 'emptyEnum', values: [], line: 4 }],
      };

      const errors = validateAnnotations(annotations);

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
