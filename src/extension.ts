import * as vscode from 'vscode';
import * as cp from 'child_process';
import Linter, { LinterError } from './linter';

export function activate(context: vscode.ExtensionContext) {
  const result = cp.spawnSync('protolint', ['version']);
  if (result.status !== 0) {
    vscode.window.showErrorMessage("protolint was not detected. Download from: https://github.com/yoheimuta/protolint");
    return;
  }

  const commandId = 'extension.protobuflint';
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(commandId);
  let events = vscode.commands.registerCommand(commandId, () => {
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      doLint(document, diagnosticCollection);
    });

    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
      doLint(document, diagnosticCollection);
    });
  });

  vscode.commands.executeCommand(commandId);
  context.subscriptions.push(events);
}

async function doLint(codeDocument: vscode.TextDocument, collection: vscode.DiagnosticCollection): Promise<void> {
  if(codeDocument.languageId === 'proto3' || codeDocument.languageId === 'proto') {
    return;
  }

  const linter = new Linter(codeDocument);
  const errors: LinterError[] = await linter.lint();
  const diagnostics = errors.map(error => {
    return new vscode.Diagnostic(error.range, error.proto.reason, vscode.DiagnosticSeverity.Warning);
  });

  collection.clear();
  collection.set(codeDocument.uri, diagnostics);
}
