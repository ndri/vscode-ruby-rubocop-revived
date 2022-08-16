import * as vscode from 'vscode';
import { Rubocop } from './rubocop';
import { onDidChangeConfiguration } from './configuration';

// entry point of extension
export function activate(context: vscode.ExtensionContext): void {
  'use strict';

  const diag = vscode.languages.createDiagnosticCollection('ruby');
  context.subscriptions.push(diag);

  const rubocop = new Rubocop(diag);
  const disposable = vscode.commands.registerCommand('ruby.rubocop', () => {
    const document = vscode.window.activeTextEditor.document;
    rubocop.execute(document);
  });

  context.subscriptions.push(disposable);

  const ws = vscode.workspace;

  ws.onDidChangeConfiguration(onDidChangeConfiguration(rubocop));

  ws.textDocuments.forEach((e: vscode.TextDocument) => {
    rubocop.execute(e);
  });

  ws.onDidOpenTextDocument((e: vscode.TextDocument) => {
    rubocop.execute(e);
  });

  ws.onWillSaveTextDocument(() => {
    rubocop.executeAutocorrectOnSave();
  });

  ws.onDidSaveTextDocument((e: vscode.TextDocument) => {
    if (rubocop.isOnSave) {
      rubocop.execute(e);
    }
  });

  ws.onDidCloseTextDocument((e: vscode.TextDocument) => {
    rubocop.clear(e);
  });

  vscode.languages.registerDocumentFormattingEditProvider(
    'ruby',
    rubocop.formattingProvider
  );
  vscode.languages.registerDocumentFormattingEditProvider(
    'gemfile',
    rubocop.formattingProvider
  );

  const autocorrectDisposable = vscode.commands.registerCommand(
    'ruby.rubocop.autocorrect',
    () => {
      return rubocop.executeAutocorrect();
    }
  );

  context.subscriptions.push(autocorrectDisposable);
}
