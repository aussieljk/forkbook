export interface OutlineParameters {
  /**
   * Outline configuration
   *
   * @see https://forkbook.ljk.dev/docs/essentials/measure-and-outline#parameters
   */
  outline?: {
    /**
     * Removes the tool and disables the feature's behavior. If you wish to turn off this feature
     * for the entire Forkbook, you can set the option in your `main.js|ts` configuration file.
     *
     * @see https://forkbook.ljk.dev/docs/essentials/measure-and-outline#disable
     */
    disable?: boolean;
  };
}

export interface OutlineTypes {
  parameters: OutlineParameters;
}
