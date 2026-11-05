import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import initHeadManager from 'next/dist/client/head-manager.js';
import { HeadManagerContext } from 'next/dist/shared/lib/head-manager-context.shared-runtime.js';

type HeadManagerValue = React.ContextType<typeof HeadManagerContext>;

const HeadManagerProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const headManager: HeadManagerValue = useMemo(initHeadManager, []);
  headManager.getIsSsr = () => false;

  return <HeadManagerContext.Provider value={headManager}>{children}</HeadManagerContext.Provider>;
};

export default HeadManagerProvider;
