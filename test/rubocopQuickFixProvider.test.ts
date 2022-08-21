import { expect } from 'chai';
import * as vscode from 'vscode';
import * as fs from 'fs';

import * as helper from './helper';
import * as fixtures from './fixtures';
import RubocopQuickFixProvider from '../src/rubocopQuickFixProvider';

describe('RubocopQuickFixProvider', () => {
  let instance: RubocopQuickFixProvider;
  let diagnostics: vscode.DiagnosticCollection;

  beforeEach(() => {
    diagnostics = vscode.languages.createDiagnosticCollection();
    instance = new RubocopQuickFixProvider(diagnostics);
  });

  describe('initialization', () => {
    describe('.diag', () => {
      it('is set to the provided DiagnosticCollection', () => {
        expect(instance).to.have.property('diag', diagnostics);
      });
    });
  });

  describe('provideCodeActions', () => {
    it('does not generate quick fixes for code without a diagnostic', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_to_quick_fix.rb',
        fixtures.rubyFileToQuickFix
      );
      const editor = await helper.openFile(filePath);
      const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
      const quickFixes = instance.provideCodeActions(editor.document, range);
      expect(quickFixes).to.be.equal(null);

      fs.unlinkSync(filePath);
    });

    it('generates quick fixes for code with an uncorrectable diagnostic', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_to_quick_fix.rb',
        fixtures.rubyFileToQuickFix
      );
      const editor = await helper.openFile(filePath);
      vscode.commands.executeCommand('ruby.rubocop', () => {
        let fileEdits: vscode.TextEdit[];

        const range = new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 0));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const quickFixes: vscode.CodeAction[] = instance.provideCodeActions(editor.document, range);
        expect(quickFixes).to.be.instanceOf(Array);
        expect(quickFixes.length).to.be.equal(4);

        expect(quickFixes[0].title).to.contain('Ignore `Lint/Void` for this line');
        expect(quickFixes[0].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[0].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(1);
        expect(fileEdits[0].newText).to.be.equal('{ # rubocop:disable Lint/Void');
        expect(quickFixes[0].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[0].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[0].command.arguments).to.be.equal(undefined);

        expect(quickFixes[1].title).to.contain('Disable `Lint/Void` for this file');
        fileEdits = quickFixes[1].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(2);
        expect(fileEdits[0].newText).to.be.equal('# rubocop:disable Lint/Void');
        expect(fileEdits[1].newText).to.be.equal('# rubocop:enable Lint/Void');
        expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[1].command.arguments).to.be.equal(undefined);

        expect(quickFixes[2].title).to.contain('Disable `Lint/Void` for this project');
        expect(quickFixes[2].edit).to.be.equal(null);
        expect(quickFixes[2].command.command).to.be.equal('ruby.rubocop.disableCop');
        expect(quickFixes[2].command.title).to.be.equal('Disable `Lint/Void` in `.rubocop.yml`');
        expect(quickFixes[2].command.arguments).to.be.equal([vscode.workspace.workspaceFolders[0], 'Lint/Void']);

        expect(quickFixes[3].title).to.contain('Show documentation for `Lint/Void`');
        expect(quickFixes[3].edit).to.be.equal(null);
        expect(quickFixes[3].command.command).to.be.equal('vscode.open');
        expect(quickFixes[3].command.title).to.be.equal('Show documentation for `Lint/Void`');
        expect(quickFixes[3].command.arguments).to.be.equal(['https://docs.rubocop.org/rubocop/cops_lint.html#lintvoid']);

        fs.unlinkSync(filePath);
      })
    });

    it('generates quick fixes for code with a correctable diagnostic', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_to_quick_fix.rb',
        fixtures.rubyFileToQuickFix
      );
      const editor = await helper.openFile(filePath);
      vscode.commands.executeCommand('ruby.rubocop', () => {
        let fileEdits: vscode.TextEdit[];

        const range = new vscode.Range(new vscode.Position(7, 7), new vscode.Position(7, 8));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const quickFixes: vscode.CodeAction[] = instance.provideCodeActions(editor.document, range);
        expect(quickFixes).to.be.instanceOf(Array);
        expect(quickFixes.length).to.be.equal(7);

        expect(quickFixes[0].title).to.contain('Fix `Layout/FirstHashElementIndentation` in this file');
        expect(quickFixes[0].edit).to.be.equal(null);
        expect(quickFixes[0].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[0].command.title).to.be.equal('Fix `Layout/FirstHashElementIndentation` in this file');
        expect(quickFixes[0].command.arguments).to.be.equal(['-A', '--only', 'Layout/FirstHashElementIndentation']);

        expect(quickFixes[1].title).to.contain('Ignore `Layout/FirstHashElementIndentation` for this line');
        expect(quickFixes[1].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[1].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(1);
        expect(fileEdits[0].newText).to.be.equal('      car: 3, # rubocop:disable Layout/FirstHashElementIndentation');
        expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[1].command.arguments).to.be.equal(undefined);

        expect(quickFixes[2].title).to.contain('Disable `Layout/FirstHashElementIndentation` for this file');
        fileEdits = quickFixes[2].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(2);
        expect(fileEdits[0].newText).to.be.equal('# rubocop:disable Layout/FirstHashElementIndentation');
        expect(fileEdits[1].newText).to.be.equal('# rubocop:enable Layout/FirstHashElementIndentation');
        expect(quickFixes[2].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[2].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[2].command.arguments).to.be.equal(undefined);

        expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[1].command.arguments).to.be.equal(undefined);

        expect(quickFixes[3].title).to.contain('Disable `Layout/FirstHashElementIndentation` for this project');
        expect(quickFixes[3].edit).to.be.equal(null);
        expect(quickFixes[3].command.command).to.be.equal('ruby.rubocop.disableCop');
        expect(quickFixes[3].command.title).to.be.equal('Disable `Layout/FirstHashElementIndentation` in `.rubocop.yml`');
        expect(quickFixes[3].command.arguments).to.be.equal([vscode.workspace.workspaceFolders[0], 'Layout/FirstHashElementIndentation']);

        expect(quickFixes[4].title).to.contain('Show documentation for `Layout/FirstHashElementIndentation`');
        expect(quickFixes[4].edit).to.be.equal(null);
        expect(quickFixes[4].command.command).to.be.equal('vscode.open');
        expect(quickFixes[4].command.title).to.be.equal('Show documentation for `Layout/FirstHashElementIndentation`');
        expect(quickFixes[4].command.arguments).to.be.equal(['https://docs.rubocop.org/rubocop/cops_layout.html#layoutfirsthashelementindentation']);

        expect(quickFixes[5].title).to.contain('Force fixing all warnings')
        expect(quickFixes[5].edit).to.be.equal(null);
        expect(quickFixes[5].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[5].command.title).to.be.equal('Force fixing all warnings');
        expect(quickFixes[5].command.arguments).to.be.equal(['-A']);

        expect(quickFixes[6].title).to.contain('Fix all warnings safely')
        expect(quickFixes[6].edit).to.be.equal(null);
        expect(quickFixes[6].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[6].command.title).to.be.equal('Fix all warnings safely');
        expect(quickFixes[6].command.arguments).to.be.equal(null);

        fs.unlinkSync(filePath);
      });

    });
  });
});
