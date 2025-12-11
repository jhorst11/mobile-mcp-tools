import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { findTemplate, discoverTemplates } from '../src/core/discovery.js';

describe('Template Version Pinning - Core Logic', () => {
  let testDir: string;

  beforeEach(() => {
    // Create unique test directory
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/versioning-simple', testId);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should discover all versions of a template', () => {
    // Create base template with multiple versions
    const versions = ['1.0.0', '1.0.1', '2.0.0'];
    for (const version of versions) {
      const dir = join(testDir, 'templates', 'my-template', version);
      mkdirSync(join(dir, 'template'), { recursive: true });
      writeFileSync(
        join(dir, 'template.json'),
        JSON.stringify({ name: 'my-template', platform: 'ios', version })
      );
      writeFileSync(join(dir, 'variables.json'), JSON.stringify({ variables: [] }));
    }

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    const templates = discoverTemplates();
    const myTemplates = templates.filter(t => t.descriptor.name === 'my-template');

    expect(myTemplates).toHaveLength(3);
    expect(myTemplates.map(t => t.descriptor.version).sort()).toEqual(['1.0.0', '1.0.1', '2.0.0']);
  });

  it('should return latest version when no version specified', () => {
    const versions = ['1.0.0', '1.5.0', '2.0.0'];
    for (const version of versions) {
      const dir = join(testDir, 'templates', 'latest-test', version);
      mkdirSync(join(dir, 'template'), { recursive: true });
      writeFileSync(
        join(dir, 'template.json'),
        JSON.stringify({ name: 'latest-test', platform: 'ios', version })
      );
      writeFileSync(join(dir, 'variables.json'), JSON.stringify({ variables: [] }));
    }

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    const template = findTemplate('latest-test');
    expect(template?.descriptor.version).toBe('2.0.0'); // Should return latest
  });

  it('should return specific version when requested', () => {
    const versions = ['1.0.0', '1.5.0', '2.0.0'];
    for (const version of versions) {
      const dir = join(testDir, 'templates', 'specific-test', version);
      mkdirSync(join(dir, 'template'), { recursive: true });
      writeFileSync(
        join(dir, 'template.json'),
        JSON.stringify({ name: 'specific-test', platform: 'ios', version })
      );
      writeFileSync(join(dir, 'variables.json'), JSON.stringify({ variables: [] }));
    }

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    expect(findTemplate('specific-test@1.0.0')?.descriptor.version).toBe('1.0.0');
    expect(findTemplate('specific-test@1.5.0')?.descriptor.version).toBe('1.5.0');
    expect(findTemplate('specific-test@2.0.0')?.descriptor.version).toBe('2.0.0');
  });

  it('should enforce version pins in extends configuration', () => {
    // Create base v1.0.0 and v2.0.0
    for (const version of ['1.0.0', '2.0.0']) {
      const dir = join(testDir, 'templates', 'pinned-base', version);
      mkdirSync(join(dir, 'template'), { recursive: true });
      writeFileSync(
        join(dir, 'template.json'),
        JSON.stringify({ name: 'pinned-base', platform: 'ios', version })
      );
      writeFileSync(join(dir, 'variables.json'), JSON.stringify({ variables: [] }));
    }

    // Create child pinned to v1.0.0
    const childDir = join(testDir, 'templates', 'pinned-child', '1.0.0');
    mkdirSync(join(childDir, 'template'), { recursive: true });
    writeFileSync(
      join(childDir, 'template.json'),
      JSON.stringify({
        name: 'pinned-child',
        platform: 'ios',
        version: '1.0.0',
        extends: {
          template: 'pinned-base',
          version: '1.0.0', // Pinned to v1
          patchFile: 'layer.patch',
        },
      })
    );
    writeFileSync(join(childDir, 'variables.json'), JSON.stringify({ variables: [] }));

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    // Verify child references correct parent version
    const child = findTemplate('pinned-child@1.0.0');
    expect(child?.descriptor.extends?.version).toBe('1.0.0');

    // Verify parent can be resolved using pinned version
    const parent = findTemplate(`pinned-base@${child?.descriptor.extends?.version}`);
    expect(parent?.descriptor.version).toBe('1.0.0');
    expect(parent?.descriptor.name).toBe('pinned-base');

    // Verify v2 exists but child is NOT using it
    const v2 = findTemplate('pinned-base@2.0.0');
    expect(v2?.descriptor.version).toBe('2.0.0');
    expect(v2?.descriptor.version).not.toEqual(parent?.descriptor.version);
  });

  it('should allow different child versions to reference different parent versions', () => {
    // Create base versions
    for (const version of ['1.0.0', '2.0.0']) {
      const dir = join(testDir, 'templates', 'multi-base', version);
      mkdirSync(join(dir, 'template'), { recursive: true });
      writeFileSync(
        join(dir, 'template.json'),
        JSON.stringify({ name: 'multi-base', platform: 'ios', version })
      );
      writeFileSync(join(dir, 'variables.json'), JSON.stringify({ variables: [] }));
    }

    // Create child v1 using base v1
    const child1Dir = join(testDir, 'templates', 'multi-child', '1.0.0');
    mkdirSync(join(child1Dir, 'template'), { recursive: true });
    writeFileSync(
      join(child1Dir, 'template.json'),
      JSON.stringify({
        name: 'multi-child',
        platform: 'ios',
        version: '1.0.0',
        extends: {
          template: 'multi-base',
          version: '1.0.0',
          patchFile: 'layer.patch',
        },
      })
    );
    writeFileSync(join(child1Dir, 'variables.json'), JSON.stringify({ variables: [] }));

    // Create child v2 using base v2
    const child2Dir = join(testDir, 'templates', 'multi-child', '2.0.0');
    mkdirSync(join(child2Dir, 'template'), { recursive: true });
    writeFileSync(
      join(child2Dir, 'template.json'),
      JSON.stringify({
        name: 'multi-child',
        platform: 'ios',
        version: '2.0.0',
        extends: {
          template: 'multi-base',
          version: '2.0.0',
          patchFile: 'layer.patch',
        },
      })
    );
    writeFileSync(join(child2Dir, 'variables.json'), JSON.stringify({ variables: [] }));

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    // Verify both child versions exist and reference correct parents
    const child1 = findTemplate('multi-child@1.0.0');
    const child2 = findTemplate('multi-child@2.0.0');

    expect(child1?.descriptor.extends?.version).toBe('1.0.0');
    expect(child2?.descriptor.extends?.version).toBe('2.0.0');

    // Verify parents are correctly resolved
    const parent1 = findTemplate(`multi-base@${child1?.descriptor.extends?.version}`);
    const parent2 = findTemplate(`multi-base@${child2?.descriptor.extends?.version}`);

    expect(parent1?.descriptor.version).toBe('1.0.0');
    expect(parent2?.descriptor.version).toBe('2.0.0');
  });

  it('should prevent fallback to different version when pinned version missing', () => {
    // Create only base v1.0.0
    const baseDir = join(testDir, 'templates', 'strict-base', '1.0.0');
    mkdirSync(join(baseDir, 'template'), { recursive: true });
    writeFileSync(
      join(baseDir, 'template.json'),
      JSON.stringify({ name: 'strict-base', platform: 'ios', version: '1.0.0' })
    );
    writeFileSync(join(baseDir, 'variables.json'), JSON.stringify({ variables: [] }));

    // Create child requesting non-existent v2.0.0
    const childDir = join(testDir, 'templates', 'strict-child', '1.0.0');
    mkdirSync(join(childDir, 'template'), { recursive: true });
    writeFileSync(
      join(childDir, 'template.json'),
      JSON.stringify({
        name: 'strict-child',
        platform: 'ios',
        version: '1.0.0',
        extends: {
          template: 'strict-base',
          version: '2.0.0', // This doesn't exist!
          patchFile: 'layer.patch',
        },
      })
    );
    writeFileSync(join(childDir, 'variables.json'), JSON.stringify({ variables: [] }));

    process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

    // Verify child exists and requests v2.0.0
    const child = findTemplate('strict-child@1.0.0');
    expect(child?.descriptor.extends?.version).toBe('2.0.0');

    // Verify the requested parent version does NOT exist
    const parent = findTemplate(`strict-base@${child?.descriptor.extends?.version}`);
    expect(parent).toBeNull(); // Should NOT find v2.0.0

    // Verify v1.0.0 exists but should NOT be used as fallback
    const v1 = findTemplate('strict-base@1.0.0');
    expect(v1?.descriptor.version).toBe('1.0.0');
  });
});
