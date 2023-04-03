import * as vscode from 'vscode';
import * as cp from 'child_process';

import { PROTOLINT_REPO_URI, PATH_CONFIGURATION_KEY, FAILOVER_PATH, TARGET_LANGUAGES } from './constants';

export function isExecutableValid(path: string): boolean {
  const result = cp.spawnSync(path, ['version']);
  if (result.status !== 0) {
    return false;
  }

  return true;
}

export function isExecutableAvailable(): string | undefined {
  let executablePath = vscode.workspace.getConfiguration('protolint').get<string>(PATH_CONFIGURATION_KEY);
  if (!executablePath) {
    // Failover when the key is missing in the configuration.
    executablePath = FAILOVER_PATH;
  }

  if (isExecutableValid(executablePath)) {
    return executablePath;
  }

  return undefined;
}

// Attempts to pick the protolint executable path via the OS UI.
// If the path is correct, updates the extension configuration and returns
// this path.
// If user fails to provide the valid executable path, returns undefined.
export async function locateExecutable(): Promise<string | undefined> {
  try {
    const userInput = await vscode.window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
      openLabel: "Use for linting"
    });

    if (!userInput || userInput.length < 1) {
      return undefined;
    }

    const path = userInput[0].fsPath;

    if (isExecutableValid(path)) {
      const config = vscode.workspace.getConfiguration('protolint');

      // Always updates the global user settings, assuming the `path`
      // scope is limited to 'machine' in package.json. It may become an
      // issue if the scope changes (e.g. to 'window').
      await config.update(PATH_CONFIGURATION_KEY, path, true);

      return path;
    } else {
      return undefined;
    }

  } catch (error) {
    return undefined;
  }
}

export async function pickPathConfiguration(): Promise<string | undefined> {
  const path = isExecutableAvailable();
  if (path !== undefined) {
    return path;
  }

  const DOWNLOAD_ACTION = "Download";
  const FIND_ACTION = "Find the file";

  const selection = await vscode.window.showWarningMessage(
    "Protolint executable was not detected. Find the unpacked executable if already downloaded.",
    DOWNLOAD_ACTION,
    FIND_ACTION
  );

  if (selection !== undefined) {
    switch (selection) {
      case FIND_ACTION:
        try {
          const result = await locateExecutable();
          if (result === undefined) {
            vscode.window.showErrorMessage("A valid linter executable wasn't found. Try fixing it in the settings.");
          }
          return result;
        } catch (error) {
          vscode.window.showErrorMessage("A valid linter executable wasn't found. Try fixing it in the settings.");
          return undefined;
        }
        break;

      case DOWNLOAD_ACTION:
        vscode.env.openExternal(vscode.Uri.parse(PROTOLINT_REPO_URI));
        break;
    }
  }

  return undefined;
}

// Returns true if the specified languageId is the target one for the extension.
export function isTargetLanguage(languageId: string): boolean {
  if (TARGET_LANGUAGES.some(item => item === languageId)) {
    return true;
  }

  return false;
}