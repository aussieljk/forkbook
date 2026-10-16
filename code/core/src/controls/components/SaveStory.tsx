import React from 'react';

import { Bar, Button, Form, Modal } from '@aussieljk/forkbook/internal/components';

import { ArrowCounterClockwiseIcon, CheckIcon, PlusIcon } from '@phosphor-icons/react';

import styles from './SaveStory.module.css';

type SaveStoryProps = {
  saveStory: () => Promise<unknown>;
  createStory: (storyName: string) => Promise<unknown>;
  resetArgs: () => void;
};

export const SaveStory = ({ saveStory, createStory, resetArgs }: SaveStoryProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [storyName, setStoryName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState(null);

  const onSaveStory = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    await saveStory().catch(() => {});
    setSaving(false);
  };

  const onShowForm = () => {
    setCreating(true);
    setStoryName('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .replace(/^[^a-z]/i, '')
      .replace(/[^a-z0-9-_ ]/gi, '')
      .replaceAll(/([-_ ]+[a-z0-9])/gi, (match) => match.toUpperCase().replace(/[-_ ]/g, ''));
    setStoryName(value.charAt(0).toUpperCase() + value.slice(1));
  };
  const onSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) {
      return;
    }
    try {
      setErrorMessage(null);
      setSaving(true);
      await createStory(storyName.replace(/^[^a-z]/i, '').replaceAll(/[^a-z0-9]/gi, ''));
      setCreating(false);
      setSaving(false);
    } catch (e: any) {
      setErrorMessage(e.message);
      setSaving(false);
    }
  };

  const saveLabel = saving ? 'Saving changes to story' : 'Save changes to story';
  const createLabel = 'Create new story with these settings';

  return (
    <div className={styles.container} id="save-from-controls">
      <Bar
        className={styles.bar}
        innerStyle={{
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div className={styles.actions}>
          <Button ariaLabel={saveLabel} tooltip={saveLabel} disabled={saving} onClick={onSaveStory}>
            <CheckIcon />
            <div className={styles.label} data-short-label="Save">
              Update story
            </div>
          </Button>

          <Button ariaLabel={createLabel} tooltip={createLabel} onClick={onShowForm}>
            <PlusIcon />
            <div className={styles.label} data-short-label="New">
              Create new story
            </div>
          </Button>

          <Button ariaLabel="Reset changes" onClick={() => resetArgs()}>
            <ArrowCounterClockwiseIcon />
            <span>Reset</span>
          </Button>
        </div>

        <Modal ariaLabel="Create new story" width={350} open={creating} onOpenChange={setCreating}>
          <Form onSubmit={onSubmitForm} id="create-new-story-form">
            <Modal.Content>
              <Modal.Header>
                <Modal.Title>Create new story</Modal.Title>
                <Modal.Description>
                  This will add a new story to your existing stories file.
                </Modal.Description>
              </Modal.Header>
              <Form.Input
                className={styles.modalInput}
                onChange={onChange}
                placeholder="Story export name"
                readOnly={saving}
                ref={inputRef}
                value={storyName}
              />
              <Modal.Actions>
                <Button
                  ariaLabel={false}
                  disabled={saving || !storyName}
                  size="medium"
                  type="submit"
                  variant="solid"
                >
                  Create
                </Button>
                <Modal.Close asChild>
                  <Button ariaLabel={false} disabled={saving} size="medium" type="reset">
                    Cancel
                  </Button>
                </Modal.Close>
              </Modal.Actions>
            </Modal.Content>
          </Form>
          {errorMessage && <Modal.Error>{errorMessage}</Modal.Error>}
        </Modal>
        <div className={styles.info}>
          <div className={styles.label} data-short-label="Unsaved changes">
            You modified this story. Do you want to save your changes?
          </div>
        </div>
      </Bar>
    </div>
  );
};
