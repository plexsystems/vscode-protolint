import * as path from 'path';
import * as vscode from 'vscode';
import * as cp from 'child_process';

const DEFAULT_PROTO_LINT_PATH = 'protolint';

let config: { protoLintPath?: string } = {
  protoLintPath: undefined
};

export function reloadConfig(): boolean {
  config.protoLintPath = resolveProtoLintPath();

  // Verify that protolint can be successfully executed on the host machine by running the version command.
  // In the event the binary cannot be executed, tell the user where to download protolint from.
  const result = cp.spawnSync(config.protoLintPath, ['version']);
  if (result.status !== 0) {
    vscode.window.showErrorMessage("protolint was not detected using path `" + config.protoLintPath + "`. Download from: https://github.com/yoheimuta/protolint");
    return false;
  }

  return true;
}

export function getConfig() {
  return config;
}

function resolveProtoLintPath(): string {
  let p = vscode.workspace.getConfiguration('protolint').get<string>('path');

  if (!p || p === DEFAULT_PROTO_LINT_PATH) {
    return DEFAULT_PROTO_LINT_PATH;
  } else if (!path.isAbsolute(p) && vscode.workspace.workspaceFolders) {
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, p);
  } else {
    return p;
  }
}
