import * as vscode from 'vscode';

import { PROTOLINT_REPO_URI, PATH_CONFIGURATION_KEY } from './constants';
import Linter from './linter';

/**
 * Attempts to pick the `protolint` executable path via the OS UI.
 * Validates the path via {@link Linter.isExecutableValid}. 
 * If the path is correct, updates the extension configuration and returns
 * this path.
 * 
 * @returns the executable path, if the user locates the valid one, otherwise `undefined`.
 */
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

    if (Linter.isExecutableValid(path)) {
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

/**
 * If `protolint` executable isn't available with the current extension settings, 
 * shows a warning with buttons:
 * - Download (opens {@link PROTOLINT_REPO_URI} in the browser).
 * - Find the file (runs {@link locateExecutable}).
 * @returns the executable path, if the user locates the valid one, otherwise `undefined`.
 */
export async function pickPathConfiguration(): Promise<string | undefined> {
  const path = Linter.isExecutableAvailable();
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