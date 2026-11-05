import type {
  ComponentManifest,
  ComponentsManifest,
  ComponentSubcomponentManifest,
} from '../../../types/index.ts';

/** Minimal docs entry type for rendering in the manifest debugger */
export interface DocsManifestEntry {
  id: string;
  name: string;
  path?: string;
  title?: string;
  content?: string;
  summary?: string;
  mdx?: { $ref: string };
  error?: { name: string; message: string };
}

/** Minimal docs manifest type for rendering in the manifest debugger */
export interface DocsManifest {
  v: number;
  docs: Record<string, DocsManifestEntry>;
}

/** The fields of one prop in the `reactComponentMeta` docgen payload. */
export interface ReactComponentMetaProp {
  name: string;
  required: boolean;
  type: { name: string; raw?: string; value?: { value: string }[] };
  description: string;
  defaultValue: { value: string } | null;
  parent?: { name: string; fileName: string };
  declarations?: { name: string; fileName: string }[];
}

/** The `reactComponentMeta` docgen payload of one component. */
export interface ReactComponentMetaDoc {
  displayName?: string;
  exportName: string;
  filePath: string;
  description: string;
  jsDocTags?: Record<string, string[]>;
  props: Record<string, ReactComponentMetaProp>;
}

export interface ComponentManifestLikeWithDocgen extends ComponentSubcomponentManifest {
  reactComponentMeta?: ReactComponentMetaDoc;
}

export type ComponentManifestStory = ComponentManifest['stories'][number];
export type ComponentManifestStories =
  | ComponentManifest['stories']
  | Record<string, ComponentManifestStory>;

/** Extended component manifest that may include docs from the docs addon */
export interface ComponentManifestWithDocs
  extends ComponentManifestLikeWithDocgen, Omit<ComponentManifest, 'stories' | 'subcomponents'> {
  stories: ComponentManifestStories;
  docs?: Record<string, DocsManifestEntry>;
  subcomponents?: Record<string, ComponentManifestLikeWithDocgen>;
}

export interface ComponentsManifestForRenderer extends Omit<ComponentsManifest, 'components'> {
  components: Record<string, ComponentManifestWithDocs>;
}
