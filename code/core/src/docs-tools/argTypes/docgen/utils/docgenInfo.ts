import type { Component } from '../../types.ts';
import { str } from './string.ts';

export function hasDocgen<T = Record<string, unknown>>(
  component: Component
): component is object & { __docgenInfo: T } {
  return !!(component as { __docgenInfo?: unknown }).__docgenInfo;
}

export function getDocgenSection<T = unknown>(component: Component, section: string): T | null {
  return hasDocgen<Record<string, T>>(component) ? component.__docgenInfo[section] : null;
}

export function getDocgenDescription(component: Component): string {
  return hasDocgen(component) ? str(component.__docgenInfo.description) : '';
}
