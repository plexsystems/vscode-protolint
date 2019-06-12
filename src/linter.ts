import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export interface LinterError {
  line: number;
  range: vscode.Range
  reason: string;
}

interface LinterHandler {
  (errors: LinterError[]): void;
}

export default class Linter {

  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
  }

  public lint(handler: LinterHandler): void {

    const fileName = this.codeDocument.fileName;

    const fileExtension = fileName.split('.').pop();
    if (fileExtension !== "proto") {
      return;
    }

    const dirname = path.dirname(fileName);
    const cmd = `protolint lint "${dirname}"`;

    const result = this.exec(cmd);
    result
      .then(() => handler([]))
      .catch((error) => handler(this.parseErrors(error)));
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((previousError: any, currentError: any) => {
      const parsedError = this.buildLinterError(currentError);
      return !parsedError ? previousError : previousError.concat(parsedError);
    }, []);

    return result;
  }

  private buildLinterError(error: string): LinterError | null {

    if (!error) {
      return null;
    }

    // Errors are in the format:
    // [path/to/file.proto:line:column] an error message is here
    const errorMessage = error.split("]")[1];
    const errorLine = parseInt(error.split(":")[1], 10);

    return {
      line: errorLine,
      range: this.codeDocument.lineAt(errorLine - 1).range,
      reason: errorMessage
    };
  }

  private exec(command: string) {
    return new Promise(function (resolve, reject) {
      cp.exec(command, (err: Error, stdout: string, stderr: string) => {
        if (!err) {
          resolve();
          return;
        }
        reject(stderr);
      });
    });
  }
}

