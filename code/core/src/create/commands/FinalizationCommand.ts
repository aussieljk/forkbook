import fs from 'node:fs/promises';

import { getProjectRoot } from '@aussieljk/forkbook/internal/common';
import { CLI_COLORS, logTracker, logger } from '@aussieljk/forkbook/internal/node-logger';
import { ErrorCollector } from '@aussieljk/forkbook/internal/telemetry';

import * as find from 'empathic/find';
import { dedent } from 'ts-dedent';

export type FinalizationCommandOptions = {
  logfile: string | boolean | undefined;
  /** When true, show the agent follow-up message instead of the normal success message */
  showAgentFollowUp: boolean;
  /** When true, show the "paste this prompt to your AI agent" instructions */
  showAiInstructions: boolean;
  /** Package-manager-aware `forkbook skills setup` command shown to agents */
  setupSkillCommand: string;
};

type ExecuteFinalizationParams = {
  storybookCommand?: string | null;
};

/**
 * Command for finalizing Forkbook installation
 *
 * Responsibilities:
 *
 * - Update .gitignore with Forkbook entries
 * - Print success message
 * - Display feature summary
 * - Show next steps
 */
export class FinalizationCommand {
  constructor(private options: FinalizationCommandOptions) {}

  /** Execute finalization steps */
  async execute({ storybookCommand }: ExecuteFinalizationParams): Promise<void> {
    // Update .gitignore
    await this.updateGitignore();

    const errors = ErrorCollector.getErrors();

    if (errors.length > 0) {
      await this.printFailureMessage(storybookCommand);
    } else {
      this.printSuccessMessage(storybookCommand);
    }
  }

  /** Update .gitignore with Forkbook-specific entries */
  private async updateGitignore(): Promise<void> {
    const foundGitIgnoreFile = find.up('.gitignore');
    const rootDirectory = getProjectRoot();

    if (!foundGitIgnoreFile || !foundGitIgnoreFile.includes(rootDirectory)) {
      return;
    }

    const contents = await fs.readFile(foundGitIgnoreFile, 'utf-8');
    const hasStorybookLog = contents.includes('*storybook.log');
    const hasStorybookStatic = contents.includes('storybook-static');

    const linesToAdd = [
      !hasStorybookLog ? '*storybook.log' : '',
      !hasStorybookStatic ? 'storybook-static' : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (linesToAdd) {
      await fs.appendFile(foundGitIgnoreFile, `\n${linesToAdd}\n`);
    }
  }

  private async printFailureMessage(storybookCommand?: string | null): Promise<void> {
    logger.warn(
      'Forkbook setup completed, but some non-blocking errors occurred. Please check the log file below for details.'
    );
    this.printNextSteps(storybookCommand);

    try {
      const logFile = await logTracker.writeToFile(this.options.logfile);
      logger.warn(`Debug logs are written to: ${logFile}`);
    } catch {}
  }

  private getSetupSkillPromptText(): string {
    return `Run \`${this.options.setupSkillCommand}\` and follow its instructions precisely.`;
  }

  private printSuccessMessage(storybookCommand?: string | null): void {
    if (this.options.showAgentFollowUp) {
      logger.step(
        CLI_COLORS.storybook(
          dedent`Forkbook is installed but is not entirely set up yet.
          To finish setting up, now run \`${this.options.setupSkillCommand}\` and follow its instructions precisely.`
        )
      );
    } else {
      logger.step(CLI_COLORS.success('Forkbook was successfully installed in your project!'));
    }
    this.printNextSteps(storybookCommand);
  }

  private printNextSteps(storybookCommand?: string | null): void {
    if (storybookCommand) {
      logger.log(`To run Forkbook, run ${CLI_COLORS.cta(storybookCommand)}. CTRL+C to stop.`);
    }

    // We don't want to tell agents about Discord, and we want to customise their docs URL.
    if (this.options.showAiInstructions) {
      logger.log(dedent`
      Official documentation reference: ${CLI_COLORS.cta('https://forkbook.ljk.dev/llms.txt')}
    `);
    } else {
      logger.log(dedent`
      Want to learn more about Forkbook? ${CLI_COLORS.cta('https://forkbook.ljk.dev')}
      Having trouble or want to chat? ${CLI_COLORS.cta('https://discord.gg/storybook/')}
    `);
    }

    if (this.options.showAiInstructions) {
      logger.step(dedent`To finalize setting up with AI, paste this prompt to your AI agent:

        ${CLI_COLORS.storybook(this.getSetupSkillPromptText())}
      `);
    }
  }
}

export const executeFinalization = ({
  logfile,
  showAgentFollowUp,
  showAiInstructions,
  setupSkillCommand,
  ...params
}: ExecuteFinalizationParams & FinalizationCommandOptions) => {
  return new FinalizationCommand({
    logfile,
    showAgentFollowUp,
    showAiInstructions,
    setupSkillCommand,
  }).execute(params);
};
