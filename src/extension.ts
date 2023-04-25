import * as vscode from 'vscode';

import { refreshDiagnostics, subscribeToDocumentChanges } from './diagnostics';

const LINT_COMMAND = "protolint.lint";
const diagnosticCollection = vscode.languages.createDiagnosticCollection("protolint");

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(diagnosticCollection);
  
  context.subscriptions.push(
    vscode.commands.registerCommand(LINT_COMMAND, runLint));

  subscribeToDocumentChanges(context, diagnosticCollection);
}

function runLint() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  refreshDiagnostics(editor.document, diagnosticCollection);
}