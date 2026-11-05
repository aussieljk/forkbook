import type { API } from '@aussieljk/forkbook/manager-api';
import type { API_Provider } from '@aussieljk/forkbook/internal/types';

export default class Provider implements API_Provider<API> {
  getElements: API_Provider<API>['getElements'] = () => {
    throw new Error('Provider.getElements() is not implemented!');
  };

  handleAPI(_api: API) {
    throw new Error('Provider.handleAPI() is not implemented!');
  }

  getConfig(): ReturnType<API_Provider<API>['getConfig']> {
    console.error('Provider.getConfig() is not implemented!');

    return {};
  }
}
