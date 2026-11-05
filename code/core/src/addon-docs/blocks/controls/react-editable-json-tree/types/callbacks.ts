import type { KeyboardEventHandler, ReactElement, Ref } from 'react';

/** The names from the root of the tree to a node. */
export type KeyPath = string[];

export type IsCollapsed = (keyPath: KeyPath, deep: number, data: unknown) => boolean;

export type ReadOnly = (
  name: string,
  data: unknown,
  keyPath: KeyPath,
  deep: number,
  dataType?: string
) => boolean;

/** Sends the new data of a node up to its parent. */
export type OnUpdate = (key: string | null, data: unknown) => void;

export interface DeltaUpdate {
  type: string;
  keyPath: KeyPath;
  deep: number;
  key: string | number;
  newValue?: unknown;
  oldValue?: unknown;
}

export type OnDeltaUpdate = (delta: DeltaUpdate) => void;

/** The props that the tree adds to a generated input or textarea element. */
export interface EditorElementProps {
  placeholder?: string;
  defaultValue?: unknown;
  ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

/** Makes the input or textarea element for a value. `key` is not set for a new value. */
export type ElementGenerator = (
  usage: string,
  keyPath: KeyPath,
  deep: number,
  key?: string,
  value?: unknown,
  dataType?: string
) => ReactElement<EditorElementProps>;

/** Runs before a change. The change happens only when the promise resolves. */
export type BeforeAction = (
  key: string | number,
  keyPath: KeyPath,
  deep: number,
  oldValue: unknown,
  newValue?: unknown
) => Promise<unknown>;

export const noBeforeAction: BeforeAction = () => Promise.resolve();

export type SubmitValueParser = (
  isEditMode: boolean,
  keyPath: KeyPath,
  deep: number,
  name: string | undefined,
  rawValue: string
) => unknown;

export interface Logger {
  error?: (error: unknown) => void;
}

/** The edit that a value node sends to its parent. */
export interface ValueUpdate {
  key: string;
  value: unknown;
}

/** The value that the add form sends to its parent. `key` is not set in an array. */
export interface AddedValue {
  key?: string;
  newValue?: unknown;
}

export type HandleUpdateValue = (update: ValueUpdate) => Promise<void>;

export const noUpdate: HandleUpdateValue = () => Promise.resolve();
