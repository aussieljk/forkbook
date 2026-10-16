import React, { useContext } from 'react';

import { Button, Modal } from '@aussieljk/forkbook/internal/components';

import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { DOCUMENTATION_FATAL_ERROR_LINK } from '../constants.ts';
import type { ErrorLike, StoreState } from '../types.ts';
import styles from './GlobalErrorModal.module.css';

export const GlobalErrorContext = React.createContext<{
  isModalOpen: boolean;
  setModalOpen?: (isOpen: boolean) => void;
}>({
  isModalOpen: false,
  setModalOpen: undefined,
});

interface GlobalErrorModalProps {
  onRerun: () => void;
  storeState: StoreState;
}

function ErrorCause({ error }: { error: ErrorLike }) {
  if (!error) {
    return null;
  }

  return (
    <div>
      <h4>
        Caused by: {error.name || 'Error'}: {error.message}
      </h4>
      {error.stack && <pre>{error.stack}</pre>}
      {error.cause && <ErrorCause error={error.cause} />}
    </div>
  );
}

export function GlobalErrorModal({ onRerun, storeState }: GlobalErrorModalProps) {
  const api = useStorybookApi();
  const { isModalOpen, setModalOpen } = useContext(GlobalErrorContext);

  const troubleshootURL = api.getDocsUrl({
    subpath: DOCUMENTATION_FATAL_ERROR_LINK,
    versioned: true,
    renderer: true,
  });

  const {
    fatalError,
    currentRun: { unhandledErrors },
  } = storeState;

  const content = fatalError ? (
    <>
      <p>{fatalError.error.name || 'Error'}</p>
      {fatalError.message && <p>{fatalError.message}</p>}
      {fatalError.error.message && <p>{fatalError.error.message}</p>}
      {fatalError.error.stack && <p>{fatalError.error.stack}</p>}
      {fatalError.error.cause && <ErrorCause error={fatalError.error.cause} />}
    </>
  ) : unhandledErrors.length > 0 ? (
    <ol>
      {unhandledErrors.map((error) => (
        <li key={error.name + error.message}>
          <p>
            {error.name}: {error.message}
          </p>
          {error.VITEST_TEST_PATH && (
            <p>
              This error originated in "<b>{error.VITEST_TEST_PATH}</b>". It doesn't mean the error
              was thrown inside the file itself, but while it was running.
            </p>
          )}
          {error.VITEST_TEST_NAME && (
            <>
              <p>
                The latest test that might've caused the error is "<b>{error.VITEST_TEST_NAME}</b>".
                It might mean one of the following:
              </p>
              <ul>
                <li>The error was thrown, while Vitest was running this test.</li>
                <li>
                  If the error occurred after the test had been completed, this was the last
                  documented test before it was thrown.
                </li>
              </ul>
            </>
          )}
          {error.stacks && (
            <>
              <p>
                <b>Stacks:</b>
              </p>
              <ul>
                {error.stacks.map((stack) => (
                  <li key={stack.file + stack.line + stack.column}>
                    {stack.file}:{stack.line}:{stack.column} - {stack.method || 'unknown method'}
                  </li>
                ))}
              </ul>
            </>
          )}
          {error.stack && <p>{error.stack}</p>}
          {error.cause ? <ErrorCause error={error.cause as ErrorLike} /> : null}
        </li>
      ))}
    </ol>
  ) : null;

  return (
    <Modal ariaLabel="Forkbook Test Error Details" onOpenChange={setModalOpen} open={isModalOpen}>
      <div className={styles.bar}>
        <Modal.Title className={styles.title}>Forkbook Test Error Details</Modal.Title>
        <div className={styles.actionBar}>
          <Button onClick={onRerun} variant="ghost" ariaLabel={false}>
            <ArrowsClockwiseIcon />
            Rerun
          </Button>
          <Button variant="ghost" ariaLabel={false} asChild>
            <a target="_blank" href={troubleshootURL} rel="noreferrer">
              Troubleshoot
            </a>
          </Button>
          <Modal.Close />
        </div>
      </div>
      <pre className={styles.stackTrace}>
        {content}
        <br />
        <br />
        Troubleshoot:{' '}
        <a className={styles.troubleshootLink} target="_blank" href={troubleshootURL}>
          {troubleshootURL}
        </a>
      </pre>
    </Modal>
  );
}
