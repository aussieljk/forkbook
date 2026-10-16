export {};

declare global {
  var __TEMPLATE_COMPONENTS__: any;
  var __FORKBOOK_ADDONS_CHANNEL__: {
    emit: any;
    on: any;
  };
  var storybookRenderer: string;
}
