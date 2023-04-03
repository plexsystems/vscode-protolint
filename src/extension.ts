import * as vscode from 'vscode';

import Linter, { LinterError } from './linter';
import { pickPathConfiguration, isExecutableAvailable, isTargetLanguage } from './helpers';

const diagnosticCollection = vscode.languages.createDiagnosticCollection("protolint");

export function activate(context: vscode.ExtensionContext) {
  const lintCommand = vscode.commands.registerCommand('protolint.lint', runLint);
  context.subscriptions.push(lintCommand);

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    // We need to filter the events by languageId.
    // E.g. saving the user's configuration via VS Code API also fires this event
    // with `jsonc` languageId, and we get an excessive error notification upon
    // saving the correct path.
    if (!isTargetLanguage(document.languageId))
      return;

    vscode.commands.executeCommand('protolint.lint');
  });

  // Run the linter when the user changes the file that they are currently viewing
  // so that the lint results show up immediately.
  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
    vscode.commands.executeCommand('protolint.lint');
  });

  vscode.commands.executeCommand('protolint.lint');
}

async function runLint() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  // We only want to run protolint on documents that are known to be
  // protocol buffer files.
  const doc = editor.document;
  if (!isTargetLanguage(doc.languageId)) {
    return;
  }

  if (isExecutableAvailable() === undefined) {
    try {
      const result = await pickPathConfiguration();
      if (result === undefined)
        return;
    } catch (error) {
      return;
    }
  }

  doLint(doc, diagnosticCollection);
}

async function doLint(codeDocument: vscode.TextDocument, collection: vscode.DiagnosticCollection): Promise<void> {
  const linter = new Linter(codeDocument);
  const errors: LinterError[] = await linter.lint();
  const diagnostics = errors.map(error => {
    return new vscode.Diagnostic(error.range, error.proto.reason, vscode.DiagnosticSeverity.Warning);
  });

  collection.set(codeDocument.uri, diagnostics);
}
