/// <reference path="./typings.d.ts" />
import { global } from '../shared/global.ts';

const { window: globalWindow } = global;

if (globalWindow) {
  globalWindow.FORKBOOK_ENV = 'react';
}
