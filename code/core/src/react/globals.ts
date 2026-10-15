/// <reference path="./typings.d.ts" />
import { global } from '@storybook/global';

const { window: globalWindow } = global;

if (globalWindow) {
  globalWindow.FORKBOOK_ENV = 'react';
}
