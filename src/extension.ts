'use strict';

import * as vscode from 'vscode';
import Linter, { LinterError } from './linter';

function doLint(codeDocument: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
  const linter = new Linter(codeDocument);
  collection.clear();

  linter.Lint((errors: LinterError[]): void => {
    if (!errors.length) {
      return;
    }

    const diagnostics = errors.map(error => {
      return new vscode.Diagnostic(error.range, error.proto.reason, vscode.DiagnosticSeverity.Warning);
    })

    collection.set(codeDocument.uri, diagnostics);
  });
}

export function activate(context: vscode.ExtensionContext) {

  const commandId = 'extension.protobuflint';
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(commandId);

  let events = vscode.commands.registerCommand(commandId, () => {

    // On Save
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      doLint(document, diagnosticCollection);
    });

    // On Open
    vscode.workspace.onDidOpenTextDocument(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        doLint(editor.document, diagnosticCollection);
      }
    });
  });

  vscode.commands.executeCommand(commandId);
  context.subscriptions.push(events);
}
