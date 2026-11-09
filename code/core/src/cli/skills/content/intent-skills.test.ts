import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SKILL_IDS } from './skills.ts';

// The static skills in `code/core/skills/` ship in the package for TanStack Intent.
const SKILLS_DIR = join(import.meta.dirname, '../../../../skills');

describe('TanStack Intent skills', () => {
  it('has one SKILL.md for each skill id, and no other', () => {
    expect(readdirSync(SKILLS_DIR).sort()).toEqual([...SKILL_IDS].sort());
  });

  it.each(SKILL_IDS)('%s has frontmatter and points to the CLI command', (id) => {
    const file = join(SKILLS_DIR, id, 'SKILL.md');
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(new RegExp(`^---\\nname: ${id}\\ndescription: .+\\n---\\n`));
    expect(text).toContain(`npx forkbook skills ${id}`);
  });
});
