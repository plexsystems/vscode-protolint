import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import { ProtoError, parseProtoError } from './protoError';

export interface LinterError {
  proto: ProtoError;
  range: vscode.Range;
}

export default class Linter {
  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
  }

  public async lint(): Promise<LinterError[]> {
    const result = await this.runProtoLint();
    if (!result) {
      return [];
    }

    const lintingErrors: LinterError[] = this.parseErrors(result);

    // When errors exist, but no linting errors were returned show the error window
    // in VSCode as it is most likely an issue with the binary itself such as not being
    // able to find a configuration or a file to lint.
    if (lintingErrors.length === 0) {
      vscode.window.showErrorMessage("protolint: " + result);
      return [];
    }


    return lintingErrors;
  }

  private async runProtoLint(): Promise<string> {
    if (!vscode.workspace.workspaceFolders) {
      return "";
    }

    let workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.getWorkspaceFolder(this.codeDocument.uri) || vscode.workspace.workspaceFolders[0];
    const cmd = `protolint lint -config_dir_path="${workspaceFolder.uri.fsPath}" "${this.codeDocument.uri.fsPath}"`;

    let lintResults: string = "";

    // Execute the protolint binary and store the output from standard error.
    // The output could either be an error from using the binary improperly, such as unable to find
    // a configuration, or linting errors.
    const exec = util.promisify(cp.exec);
    await exec(cmd).catch((error: any) => lintResults = error.stderr);

    return lintResults;
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((errors: LinterError[], currentError: string) => {
      const parsedError = parseProtoError(currentError);
      if (!parsedError.reason) {
        return errors;
      }

      const linterError: LinterError = {
        proto: parsedError,
        range: this.codeDocument.lineAt(parsedError.line - 1).range
      };

      return errors.concat(linterError);
    }, []);

    return result;
  }
}
