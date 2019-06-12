import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProtoError, parseProtoError } from './protoError'

export interface LinterError {
  proto: ProtoError,
  range: vscode.Range
}

interface LinterHandler {
  (errors: LinterError[]): void;
}

export default class Linter {

  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
  }

  public Lint(handler: LinterHandler): void {

    const fileName = this.codeDocument.fileName;

    const fileExtension = fileName.split('.').pop();
    if (fileExtension !== "proto") {
      return;
    }

    this.runProtoLint(fileName, handler);
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((previousError: any, currentError: any) => {
      const parsedError = parseProtoError(currentError);

      if (!parsedError.reason) {
        return previousError;
      }

      const linterError: LinterError = this.createLinterError(parsedError)

      return previousError.concat(linterError)
    }, []);

    return result;
  }

  private runProtoLint(fileName: string, handler: LinterHandler): void {
    const dirname = path.dirname(fileName);
    const cmd = `protolint lint "${dirname}"`;

    const result = this.exec(cmd);
    result
      .then(() => handler([]))
      .catch((error) => handler(this.parseErrors(error)));
  }

  private createLinterError(error: ProtoError): LinterError {
    const linterError: LinterError = {
      proto: error,
      range: this.getErrorRange(error)
    };

    return linterError;
  }

  private getErrorRange(error: ProtoError): vscode.Range {
    return this.codeDocument.lineAt(error.line - 1).range
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
