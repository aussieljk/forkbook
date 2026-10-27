import React from 'react';

import { Select } from '@aussieljk/forkbook/internal/components';

import { AccessibilityIcon } from 'lucide-react';

import { useGlobals } from '@aussieljk/forkbook/manager-api';

import { VISION_GLOBAL_KEY } from '../constants.ts';
import { filterDefs, filters } from '../visionSimulatorFilters.ts';
import styles from './VisionSimulator.module.css';

export const VisionSimulator = () => {
  const [globals, updateGlobals, storyGlobals] = useGlobals();
  const value = globals[VISION_GLOBAL_KEY];
  const isLocked = storyGlobals[VISION_GLOBAL_KEY] !== undefined;

  const options = Object.entries(filters).map(([key, { label, percentage }]) => ({
    title: label,
    description: percentage ? `${percentage}% of users` : undefined,
    icon: (
      <span
        className={styles.colorIcon}
        style={{ filter: filters[key as keyof typeof filters].filter || 'none' }}
      />
    ),
    value: key,
  }));

  return (
    <>
      <Select
        resetLabel="Reset color filter"
        onReset={() => updateGlobals({ [VISION_GLOBAL_KEY]: undefined })}
        icon={<AccessibilityIcon />}
        disabled={isLocked}
        ariaLabel={isLocked ? 'Vision filter set by story globals' : 'Vision filter'}
        ariaDescription="Select a vision filter among predefined options, or reset to remove the filter."
        tooltip={isLocked ? 'Vision filter set by story globals' : 'Change vision filter'}
        defaultOptions={value}
        options={options}
        onSelect={(selected) => updateGlobals({ [VISION_GLOBAL_KEY]: selected })}
      />
      <div className={styles.hidden} dangerouslySetInnerHTML={{ __html: filterDefs }} />
    </>
  );
};
