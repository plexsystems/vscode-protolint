/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import Linter, { LinterError } from './linter';
import { PROTOBUF_SELECTOR } from './constants';
import { pickPathConfiguration } from './helpers';

export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection
): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      editor => {
        if (editor) {
          refreshDiagnostics(editor.document, diagnosticCollection);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(
      doc => refreshDiagnostics(doc, diagnosticCollection)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(
      doc => diagnosticCollection.delete(doc.uri)
    )
  );

  // Refresh the diagnostics when the document language is changed 
  // to protocol buffers.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(
      doc => refreshDiagnostics(doc, diagnosticCollection)
    )
  );

}

/**
 * Analyzes the protocol buffer document for problems.
 * 
 * @remarks
 * If the document is not identified as protocol buffer, the diagnostics won't be added.
 * It the document language is changed and it's not protocol buffer anymore, its 
 * diagnostics will be deleted.
 * 
 * @param doc protocol buffer document to analyze
 * @param diagnosticCollection diagnostic collection
 */
export async function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
  if (vscode.languages.match(PROTOBUF_SELECTOR, doc) === 0) {
    diagnosticCollection.delete(doc.uri);
    return;
  }

  if (Linter.isExecutableAvailable() === undefined) {
    try {
      const result = await pickPathConfiguration();
      if (result === undefined) {
        return;
      }
    } catch (error) {
      return;
    }
  }

  const linter = new Linter(doc);
  const errors: LinterError[] = await linter.lint();
  const diagnostics = errors.map(error => {
    const diagnostic = new vscode.Diagnostic(error.range, error.proto.reason, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = 'protolint';
    return diagnostic;
  });

  diagnosticCollection.set(doc.uri, diagnostics);
}