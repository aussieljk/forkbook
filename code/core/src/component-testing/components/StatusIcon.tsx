import React from 'react';

import { CheckIcon, CircleIcon, PlayIcon, CircleStopIcon } from 'lucide-react';

import { useTheme } from '@aussieljk/forkbook/theming';

import { type Call, CallStates } from '../../instrumenter/types.ts';

export interface StatusIconProps {
  status: Call['status'];
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const theme = useTheme();

  switch (status) {
    case CallStates.DONE: {
      return <CheckIcon color={theme.color.positive} data-testid="icon-done" />;
    }
    case CallStates.ERROR: {
      return <CircleStopIcon color={theme.color.negative} data-testid="icon-error" />;
    }
    case CallStates.ACTIVE: {
      return <PlayIcon color={theme.color.secondary} data-testid="icon-active" />;
    }
    case CallStates.WAITING: {
      return (
        <div
          style={{
            width: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid="icon-waiting"
        >
          <CircleIcon color="rgba(204, 204, 204, 0.5)" size={6} />
        </div>
      );
    }
    default: {
      return null;
    }
  }
};
