import * as vscode from 'vscode';
import * as cp from 'child_process';
import Linter, { LinterError } from './linter';

const diagnosticCollection = vscode.languages.createDiagnosticCollection("protolint");

export function activate(context: vscode.ExtensionContext) {

  // Verify that protolint can be successfully executed on the host machine by running the version command.
  // In the event the binary cannot be executed, tell the user where to download protolint from.
  const result = cp.spawnSync('protolint', ['version']);
  if (result.status !== 0) {
    vscode.window.showErrorMessage("protolint was not detected. Download from: https://github.com/yoheimuta/protolint");
    return;
  }

  vscode.commands.registerCommand('protolint.lint', runLint);

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    vscode.commands.executeCommand('protolint.lint');
  });

  // Run the linter when the user changes the file that they are currently viewing
  // so that the lint results show up immediately.
  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
    vscode.commands.executeCommand('protolint.lint');
  });
}

function runLint() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
      return;
  }

  // We only want to run protolint on documents that are known to be
  // protocol buffer files.
  const doc = editor.document;
  if(doc.languageId !== 'proto3' && doc.languageId !== 'proto') {
    return;
  }

  doLint(doc, diagnosticCollection);
}

async function doLint(codeDocument: vscode.TextDocument, collection: vscode.DiagnosticCollection): Promise<void> {
  const linter = new Linter(codeDocument);
  const errors: LinterError[] = await linter.lint();
  const diagnostics = errors.map(error => {
    return new vscode.Diagnostic(error.range, error.proto.reason, vscode.DiagnosticSeverity.Warning);
  });

  collection.clear();
  collection.set(codeDocument.uri, diagnostics);
}
