import React from 'react';

import {
  BellIcon,
  HouseIcon,
  MinusIcon,
  PlusIcon,
  SmileyIcon,
  WarningIcon,
} from '@phosphor-icons/react';

import { IconGallery, IconItem } from './IconGallery';

export default {
  component: IconGallery,
};

export const DefaultStyle = () => (
  <IconGallery>
    <IconItem name="add">
      <PlusIcon />
    </IconItem>
    <IconItem name="subtract">
      <MinusIcon />
    </IconItem>
    <IconItem name="home">
      <HouseIcon />
    </IconItem>
    <IconItem name="facehappy">
      <SmileyIcon />
    </IconItem>
    <IconItem name="bar">
      <img src="https://forkbook.ljk.dev/images/placeholders/50x50.png" alt="example" />
    </IconItem>
    <IconItem name="very-long-icon-name">
      <WarningIcon />
    </IconItem>
    <IconItem name="very-long-icon-name-that-should-truncate">
      <BellIcon />
    </IconItem>
  </IconGallery>
);
