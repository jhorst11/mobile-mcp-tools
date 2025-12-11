/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

describe('CLI Template Version Command', () => {
  let testDir: string;
  let templatesDir: string;

  beforeEach(() => {
    // Create unique test directory
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/cli-version', testId);
    templatesDir = join(testDir, 'templates');
    mkdirSync(templatesDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Base Template Versioning', () => {
    it('should create a new version of a base template', () => {
      // Create initial version
      const baseDir = join(templatesDir, 'test-base', '1.0.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({
          name: 'test-base',
          platform: 'ios',
          version: '1.0.0',
          description: 'Test base template',
        })
      );

      writeFileSync(
        join(baseDir, 'variables.json'),
        JSON.stringify({
          variables: [{ name: 'appName', type: 'string', required: true, default: 'MyApp' }],
        })
      );

      writeFileSync(join(baseDir, 'template', 'App.swift'), 'let appName = "{{appName}}"');
      writeFileSync(join(baseDir, 'README.md'), '# test-base v1.0.0');

      // Set environment variable
      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create new version
      execSync('magen-template template version test-base 2.0.0 --out ' + templatesDir, {
        stdio: 'pipe',
      });

      // Verify new version was created
      const newVersionDir = join(templatesDir, 'test-base', '2.0.0');
      expect(existsSync(newVersionDir)).toBe(true);

      // Verify template.json has correct version
      const templateJson = JSON.parse(readFileSync(join(newVersionDir, 'template.json'), 'utf-8'));
      expect(templateJson.version).toBe('2.0.0');
      expect(templateJson.name).toBe('test-base');

      // Verify files were copied
      expect(existsSync(join(newVersionDir, 'template', 'App.swift'))).toBe(true);
      expect(existsSync(join(newVersionDir, 'variables.json'))).toBe(true);
      expect(existsSync(join(newVersionDir, 'README.md'))).toBe(true);

      // Verify content is identical to source
      const appContent = readFileSync(join(newVersionDir, 'template', 'App.swift'), 'utf-8');
      expect(appContent).toBe('let appName = "{{appName}}"');
    });

    it('should use latest version as source when not specified', () => {
      // Create multiple versions
      for (const version of ['1.0.0', '1.5.0', '2.0.0']) {
        const versionDir = join(templatesDir, 'multi-base', version);
        mkdirSync(join(versionDir, 'template'), { recursive: true });

        writeFileSync(
          join(versionDir, 'template.json'),
          JSON.stringify({ name: 'multi-base', platform: 'ios', version })
        );

        writeFileSync(join(versionDir, 'variables.json'), JSON.stringify({ variables: [] }));

        writeFileSync(join(versionDir, 'template', 'version.txt'), version);
      }

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create 3.0.0 (should copy from 2.0.0)
      execSync('magen-template template version multi-base 3.0.0 --out ' + templatesDir, {
        stdio: 'pipe',
      });

      // Verify it copied from 2.0.0
      const versionContent = readFileSync(
        join(templatesDir, 'multi-base', '3.0.0', 'template', 'version.txt'),
        'utf-8'
      );
      expect(versionContent).toBe('2.0.0'); // Content from source
    });

    it('should use specified source version', () => {
      // Create versions 1.0.0 and 2.0.0
      for (const version of ['1.0.0', '2.0.0']) {
        const versionDir = join(templatesDir, 'src-base', version);
        mkdirSync(join(versionDir, 'template'), { recursive: true });

        writeFileSync(
          join(versionDir, 'template.json'),
          JSON.stringify({ name: 'src-base', platform: 'ios', version })
        );

        writeFileSync(join(versionDir, 'variables.json'), JSON.stringify({ variables: [] }));
        writeFileSync(join(versionDir, 'template', 'version.txt'), `v${version}`);
      }

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create 1.0.1 from 1.0.0 (not 2.0.0)
      execSync(
        'magen-template template version src-base 1.0.1 --source-version 1.0.0 --out ' +
          templatesDir,
        { stdio: 'pipe' }
      );

      // Verify it copied from 1.0.0
      const versionContent = readFileSync(
        join(templatesDir, 'src-base', '1.0.1', 'template', 'version.txt'),
        'utf-8'
      );
      expect(versionContent).toBe('v1.0.0');
    });

    it('should reject invalid semver format', () => {
      const baseDir = join(templatesDir, 'invalid-base', '1.0.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({ name: 'invalid-base', platform: 'ios', version: '1.0.0' })
      );

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Try invalid version formats
      expect(() => {
        execSync('magen-template template version invalid-base 2.0 --out ' + templatesDir, {
          stdio: 'pipe',
        });
      }).toThrow();

      expect(() => {
        execSync('magen-template template version invalid-base v2.0.0 --out ' + templatesDir, {
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('should reject if version already exists', () => {
      // Create versions 1.0.0 and 2.0.0
      for (const version of ['1.0.0', '2.0.0']) {
        const versionDir = join(templatesDir, 'exists-base', version);
        mkdirSync(join(versionDir, 'template'), { recursive: true });

        writeFileSync(
          join(versionDir, 'template.json'),
          JSON.stringify({ name: 'exists-base', platform: 'ios', version })
        );

        writeFileSync(join(versionDir, 'variables.json'), JSON.stringify({ variables: [] }));
      }

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Try to create 2.0.0 again (already exists)
      expect(() => {
        execSync('magen-template template version exists-base 2.0.0 --out ' + templatesDir, {
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });

  describe('Layered Template Versioning', () => {
    it('should create a new version of a layered template', () => {
      // Create base template
      const baseDir = join(templatesDir, 'layer-base', '1.0.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({ name: 'layer-base', platform: 'ios', version: '1.0.0' })
      );

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));
      writeFileSync(join(baseDir, 'template', 'Base.txt'), 'base content');

      // Create layered template v1.0.0
      const layerDir = join(templatesDir, 'layer-child', '1.0.0');
      mkdirSync(layerDir, { recursive: true });

      writeFileSync(
        join(layerDir, 'template.json'),
        JSON.stringify({
          name: 'layer-child',
          platform: 'ios',
          version: '1.0.0',
          extends: {
            template: 'layer-base',
            version: '1.0.0',
            patchFile: 'layer.patch',
          },
        })
      );

      // Create a simple patch
      const patchContent = `diff --git a/Base.txt b/Base.txt
index abc123..def456 100644
--- a/Base.txt
+++ b/Base.txt
@@ -1 +1,2 @@
 base content
+child addition
`;

      writeFileSync(join(layerDir, 'layer.patch'), patchContent);
      writeFileSync(join(layerDir, 'README.md'), '# layer-child v1.0.0');

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create new version
      execSync('magen-template template version layer-child 2.0.0 --out ' + templatesDir, {
        stdio: 'pipe',
      });

      // Verify new version was created
      const newVersionDir = join(templatesDir, 'layer-child', '2.0.0');
      expect(existsSync(newVersionDir)).toBe(true);

      // Verify template.json has correct version
      const templateJson = JSON.parse(readFileSync(join(newVersionDir, 'template.json'), 'utf-8'));
      expect(templateJson.version).toBe('2.0.0');
      expect(templateJson.name).toBe('layer-child');
      expect(templateJson.extends.template).toBe('layer-base');

      // Verify layer.patch was copied
      expect(existsSync(join(newVersionDir, 'layer.patch'))).toBe(true);

      // Verify README was copied
      expect(existsSync(join(newVersionDir, 'README.md'))).toBe(true);

      // Verify work directory was created with parent files
      expect(existsSync(join(newVersionDir, 'work'))).toBe(true);
      expect(existsSync(join(newVersionDir, 'work', 'Base.txt'))).toBe(true);
    });

    it('should maintain parent version reference', () => {
      // Create base template
      const baseDir = join(templatesDir, 'pin-base', '1.5.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({ name: 'pin-base', platform: 'ios', version: '1.5.0' })
      );

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));
      writeFileSync(join(baseDir, 'template', 'Base.txt'), 'base');

      // Create layered template pinned to 1.5.0
      const layerDir = join(templatesDir, 'pin-child', '1.0.0');
      mkdirSync(layerDir, { recursive: true });

      writeFileSync(
        join(layerDir, 'template.json'),
        JSON.stringify({
          name: 'pin-child',
          platform: 'ios',
          version: '1.0.0',
          extends: {
            template: 'pin-base',
            version: '1.5.0', // Pinned to specific version
            patchFile: 'layer.patch',
          },
        })
      );

      writeFileSync(join(layerDir, 'layer.patch'), 'diff --git a/Base.txt b/Base.txt\n');

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create new version
      execSync('magen-template template version pin-child 2.0.0 --out ' + templatesDir, {
        stdio: 'pipe',
      });

      // Verify parent version is still pinned to 1.5.0
      const templateJson = JSON.parse(
        readFileSync(join(templatesDir, 'pin-child', '2.0.0', 'template.json'), 'utf-8')
      );
      expect(templateJson.extends.version).toBe('1.5.0');
    });

    it('should not create template/ directory for layered templates', () => {
      // Create base
      const baseDir = join(templatesDir, 'nodir-base', '1.0.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({ name: 'nodir-base', platform: 'ios', version: '1.0.0' })
      );

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));
      writeFileSync(join(baseDir, 'template', 'Base.txt'), 'base');

      // Create layered template
      const layerDir = join(templatesDir, 'nodir-child', '1.0.0');
      mkdirSync(layerDir, { recursive: true });

      writeFileSync(
        join(layerDir, 'template.json'),
        JSON.stringify({
          name: 'nodir-child',
          platform: 'ios',
          version: '1.0.0',
          extends: {
            template: 'nodir-base',
            version: '1.0.0',
            patchFile: 'layer.patch',
          },
        })
      );

      writeFileSync(join(layerDir, 'layer.patch'), 'diff --git a/Base.txt b/Base.txt\n');

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Create new version
      execSync('magen-template template version nodir-child 2.0.0 --out ' + templatesDir, {
        stdio: 'pipe',
      });

      // Layered templates should NOT have template/ directory
      expect(existsSync(join(templatesDir, 'nodir-child', '2.0.0', 'template'))).toBe(false);

      // But should have work/ directory
      expect(existsSync(join(templatesDir, 'nodir-child', '2.0.0', 'work'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should error if source template does not exist', () => {
      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      expect(() => {
        execSync('magen-template template version nonexistent 2.0.0 --out ' + templatesDir, {
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('should error if source version does not exist', () => {
      // Create only version 1.0.0
      const baseDir = join(templatesDir, 'missing-base', '1.0.0');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({ name: 'missing-base', platform: 'ios', version: '1.0.0' })
      );

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));

      process.env.MAGEN_TEMPLATES_PATH = templatesDir;

      // Try to create from non-existent 2.0.0
      expect(() => {
        execSync(
          'magen-template template version missing-base 3.0.0 --source-version 2.0.0 --out ' +
            templatesDir,
          { stdio: 'pipe' }
        );
      }).toThrow();
    });
  });
});
