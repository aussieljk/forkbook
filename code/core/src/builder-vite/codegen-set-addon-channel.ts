export async function generateAddonSetupCode() {
  return `
    import { createBrowserChannel } from '@aussieljk/forkbook/internal/channels';
    import { addons } from '@aussieljk/forkbook/preview-api';

    const channel = createBrowserChannel({ page: 'preview' });
    addons.setChannel(channel);
    
    if (window.CONFIG_TYPE === 'DEVELOPMENT'){
      window.__STORYBOOK_SERVER_CHANNEL__ = channel;
    }
  `.trim();
}
