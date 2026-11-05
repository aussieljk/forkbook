/**
 * A large, fixed index (about 1,700 entries) for the sidebar Tree and Search stories. Code builds
 * it, so it is the same each time.
 *
 * The stories use these entries by id:
 *
 * - The first story in the index (`images--marketing-hero`).
 * - Every entry whose id starts with `tooltip`, including `tooltip-tooltipbuildlist--default` and
 *   `tooltip-tooltipselect--default`.
 */
import type {
  API_ComponentEntry,
  API_GroupEntry,
  API_RootEntry,
} from '@aussieljk/forkbook/internal/types';

import type { Dataset } from './types.ts';

type ParentEntry = API_RootEntry | API_GroupEntry | API_ComponentEntry;

export const index: Dataset = {};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function childId(parent: string | undefined, name: string) {
  const id = parent ? `${parent}-${slug(name)}` : slug(name);
  if (parent) (index[parent] as ParentEntry).children.push(id);
  return id;
}

function titleOf(id: string | undefined): string[] {
  if (!id) return [];
  const entry = index[id] as ParentEntry;
  return [...titleOf('parent' in entry ? entry.parent : undefined), entry.name];
}

function addRoot(name: string) {
  const id = slug(name);
  index[id] = { type: 'root', id, name, depth: 0, children: [], tags: [] };
  return id;
}

function addGroup(parent: string, depth: number, name: string) {
  const id = childId(parent, name);
  index[id] = { type: 'group', id, name, parent, depth, children: [], tags: [] };
  return id;
}

function addComponent(parent: string | undefined, depth: number, name: string, stories: string[]) {
  const id = childId(parent, name);
  const title = [...titleOf(parent), name].join('/');
  const children = stories.map((story) => `${id}--${slug(story)}`);
  index[id] = { type: 'component', id, name, parent, depth, children, tags: [] };
  for (const [i, story] of stories.entries()) {
    const storyId = children[i];
    index[storyId] = {
      type: 'story',
      subtype: 'story',
      id: storyId,
      title,
      name: story,
      exportName: story,
      importPath: './path.js',
      args: {},
      argTypes: {},
      initialArgs: {},
      depth: depth + 1,
      parent: id,
      prepared: true,
      tags: [],
    };
  }
}

const storyNames = ['default', 'loading', 'empty', 'error', 'with long name', 'mobile'];
const stories = (count: number) => storyNames.slice(0, count);

const adjectives = [
  'Account',
  'Activity',
  'Baseline',
  'Build',
  'Comment',
  'Project',
  'Review',
  'Snapshot',
  'Status',
  'Team',
];
const nouns = [
  'Badge',
  'Card',
  'Header',
  'Item',
  'List',
  'Menu',
  'Message',
  'Panel',
  'Table',
  'Tooltip',
];
// 100 names: AccountBadge, AccountCard, ..., TeamTooltip.
const words = (count: number) =>
  adjectives.flatMap((adjective) => nouns.map((noun) => adjective + noun)).slice(0, count);

// A component at the top level. Its first story is the first story in the index.
addComponent(undefined, 0, 'Images', [
  'marketing hero',
  'brand',
  'colored icons',
  'logos',
  'shapes',
  'thumbnails',
  'payment',
]);

// A root with a docs entry and some components.
const emails = addRoot('Emails');
index[childId(emails, 'Introduction')] = {
  type: 'docs',
  id: 'emails-introduction',
  title: 'Emails',
  name: 'Introduction',
  importPath: './path.js',
  parent: emails,
  depth: 1,
  prepared: true,
  tags: [],
};
for (const name of words(5)) addComponent(emails, 1, name, stories(5));

// The Tree stories use these entries by id.
const tooltip = addRoot('tooltip');
addComponent(tooltip, 1, 'TooltipBuildList', ['default', 'no commit']);
addComponent(tooltip, 1, 'TooltipSelect', ['default']);

// A wide root: 100 components with 6 stories each.
const components = addRoot('Webapp components');
for (const name of words(100)) addComponent(components, 1, name, stories(6));

const containers = addRoot('Webapp containers');
for (const name of words(2)) addComponent(containers, 1, `${name}Container`, stories(3));

const layouts = addRoot('Webapp layouts');
for (const name of words(7)) addComponent(layouts, 1, `${name}Layout`, stories(3));

// A deep root: groups with components, and nested groups down to depth 4.
const screens = addRoot('Webapp screens');
for (const screen of [...nouns, ...adjectives].slice(0, 15)) {
  const group = addGroup(screens, 1, screen);
  for (const name of words(4)) addComponent(group, 2, `${screen}${name}`, stories(6));
  const details = addGroup(group, 2, 'Details');
  for (const name of words(4)) addComponent(details, 3, `${screen}${name}Details`, stories(5));
  addComponent(addGroup(details, 3, 'States'), 4, `${screen}States`, stories(3));
}
