/**
 * If you can't find a suitable category for your error, create one based on the package name/file
 * path of which the error is thrown. For instance: If it's from `@storybook/node-logger`, then
 * NODE-LOGGER If it's from a package that is too broad, e.g. @aussieljk/forkbook/internal/cli-commands in the init command,
 * then use a combination like CLI_INIT
 */
export enum Category {
  CLI = 'CLI',
  CLI_INIT = 'CLI_INIT',
  CLI_ADD = 'CLI_ADD',
  CODEMOD = 'CODEMOD',
  CORE_SERVER = 'CORE-SERVER',
  CSF_PLUGIN = 'CSF-PLUGIN',
  CSF_TOOLS = 'CSF-TOOLS',
  CORE_COMMON = 'CORE-COMMON',
  NODE_LOGGER = 'NODE-LOGGER',
  TELEMETRY = 'TELEMETRY',
  BUILDER_MANAGER = 'BUILDER-MANAGER',
  BUILDER_VITE = 'BUILDER-VITE',
  SOURCE_LOADER = 'SOURCE-LOADER',
  POSTINSTALL = 'POSTINSTALL',
  DOCS_TOOLS = 'DOCS-TOOLS',
  FRAMEWORK_NEXTJS = 'FRAMEWORK_NEXTJS',
  FRAMEWORK_REACT_VITE = 'FRAMEWORK_REACT-VITE',
}
