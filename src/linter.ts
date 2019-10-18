import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import { ProtoError, parseProtoError } from './protoError';

export interface LinterError {
  proto: ProtoError;
  range: vscode.Range;
}

export default class Linter {
  private workspaceFolder: any;
  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
    this.workspaceFolder = vscode.workspace.workspaceFolders[0];
  }

  public async lint(): Promise<LinterError[]> {
    const errors = await this.runProtoLint();
    if (!errors) {
      return [];
    }

    const lintingErrors: LinterError[] = this.parseErrors(errors);
    return lintingErrors;
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((errors: LinterError[], currentError: string) => {
      const parsedError = parseProtoError(currentError);
      if (!parsedError.reason) {
        return errors;
      }

      const linterError: LinterError = this.createLinterError(parsedError);
      return errors.concat(linterError);
    }, []);

    return result;
  }

  private async runProtoLint(): Promise<string> {
    const currentFilePath = this.codeDocument.uri.fsPath;
    const workspaceRootPath = this.workspaceFolder.uri.fsPath;
    const exec = util.promisify(cp.exec);
    const cmd = `protolint lint -config_dir_path=${workspaceRootPath} ${currentFilePath}`;

    let lintResults: string = "";
    await exec(cmd).catch((error: any) => lintResults = error.stderr);

    return lintResults;
  }

  private createLinterError(error: ProtoError): LinterError {
    const linterError: LinterError = {
      proto: error,
      range: this.getErrorRange(error)
    };

    return linterError;
  }

  private getErrorRange(error: ProtoError): vscode.Range {
    return this.codeDocument.lineAt(error.line - 1).range;
  }
}
