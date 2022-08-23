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

    describe('generates quick fixes for code with an uncorrectable diagnostic', () => {
      let fileEdits: vscode.TextEdit[];
      let range: vscode.Range;
      let quickFixes: vscode.CodeAction[];
      let editor: vscode.TextEditor;
      let filePath: string;

      beforeEach(async function() {
        this.timeout(5000);
        await helper.closeAllEditors();

        filePath = helper.createTempFile(
          'file_to_quick_fix.rb',
          fixtures.rubyFileToQuickFix
        );
        editor = await helper.openFile(filePath);

        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 0)),
`Literal \`{
      car: 3, # some comment
    boot: 56, bonnet: 10
}\` used in void context.`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = '(warning:Lint/Void)';
        diagnostics.set(editor.document.uri, [diagnostic]);

        range = new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 0));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        quickFixes = instance.provideCodeActions(editor.document, range);

        expect(quickFixes).to.be.instanceOf(Array);
        expect(quickFixes.length).to.be.equal(3);
      });

      afterEach(() => {
        fs.unlinkSync(filePath);
      });

      it('ignores `Lint/Void` for line', () => {
        expect(quickFixes[0].title).to.equal('Ignore (line) `Lint/Void`');

        expect(quickFixes[0].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[0].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[0].command.arguments).to.be.equal(undefined);

        expect(quickFixes[0].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[0].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(1);

        expect(fileEdits[0].newText).to.be.equal('{ # rubocop:disable Lint/Void');
        range = new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 29));
        expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));
      });

      it('disables `Lint/Void` for file', () => {
        expect(quickFixes[1].title).to.be.equal('Disable (file) `Lint/Void`');

        expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[1].command.arguments).to.be.equal(undefined);

        expect(quickFixes[1].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[1].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(2);

        expect(fileEdits[0].newText).to.be.equal('# rubocop:disable Lint/Void\n');
        range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
        expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));

        expect(fileEdits[1].newText).to.be.equal('\n# rubocop:enable Lint/Void\n');
        range = new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0));
        expect(JSON.stringify(fileEdits[1].range)).to.be.equal(JSON.stringify(range));
      });

      it('shows the documentation for `Lint/Void`', () => {
        expect(quickFixes[2].title).to.contain('Show documentation for `Lint/Void`');
        expect(quickFixes[2].edit).to.be.equal(undefined);

        expect(quickFixes[2].command.command).to.be.equal('vscode.open');
        expect(quickFixes[2].command.title).to.be.equal('Show documentation for `Lint/Void`');
        expect(quickFixes[2].command.arguments.length).to.be.equal(1);
        expect(quickFixes[2].command.arguments[0]).to.be.equal('https://docs.rubocop.org/rubocop/cops_lint.html#lintvoid');
      });
    });

    describe('generates quick fixes for code with a correctable diagnostic', () => {
      let fileEdits: vscode.TextEdit[];
      let range: vscode.Range;
      let quickFixes: vscode.CodeAction[];
      let editor: vscode.TextEditor;
      let filePath: string;

      beforeEach(async function() {
        this.timeout(5000);
        await helper.closeAllEditors();

        filePath = helper.createTempFile(
          'file_to_quick_fix.rb',
          fixtures.rubyFileToQuickFix
        );
        editor = await helper.openFile(filePath);

        await helper.sleep(500);
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(new vscode.Position(6, 7), new vscode.Position(6, 12)),
          'Use 2 spaces for indentation in a hash, relative to the start of the line where the left curly brace is.',
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = '[Correctable](convention:Layout/FirstHashElementIndentation)';
        diagnostics.set(editor.document.uri, [diagnostic]);

        range = new vscode.Range(new vscode.Position(6, 7), new vscode.Position(6, 8));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        quickFixes = instance.provideCodeActions(editor.document, range);

        expect(quickFixes).to.be.instanceOf(Array);
        expect(quickFixes.length).to.be.equal(6);
      });

      afterEach(() => {
        fs.unlinkSync(filePath);
      });

      it('fixes `Layout/FirstHashElementIndentation` in file', () => {
        expect(quickFixes[0].title).to.be.equal('Fix `Layout/FirstHashElementIndentation`');
        expect(quickFixes[0].edit).to.be.equal(undefined);
        expect(quickFixes[0].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[0].command.title).to.be.equal('Fix `Layout/FirstHashElementIndentation`');
        expect(JSON.stringify(quickFixes[0].command.arguments)).to.be.equal(JSON.stringify(['-A', '--only', 'Layout/FirstHashElementIndentation']));
      });

      it('ignores `Layout/FirstHashElementIndentation` for line', () => {
        expect(quickFixes[1].title).to.be.equal('Ignore (line) `Layout/FirstHashElementIndentation`');

        expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[1].command.arguments).to.be.equal(undefined);

        expect(quickFixes[1].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[1].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(1);

        expect(fileEdits[0].newText).to.be.equal(' # rubocop:disable Layout/FirstHashElementIndentation');
        range = new vscode.Range(new vscode.Position(6, 13), new vscode.Position(6, 66));
        expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));
      });

      it('disables `Layout/FirstHashElementIndentation` for file', () => {
        expect(quickFixes[2].title).to.be.equal('Disable (file) `Layout/FirstHashElementIndentation`');

        expect(quickFixes[2].command.command).to.be.equal('ruby.rubocop');
        expect(quickFixes[2].command.title).to.be.equal('Lint the file with Rubocop');
        expect(quickFixes[2].command.arguments).to.be.equal(undefined);

        expect(quickFixes[2].edit).to.be.instanceOf(vscode.WorkspaceEdit);
        fileEdits = quickFixes[2].edit.get(editor.document.uri);
        expect(fileEdits.length).to.be.equal(2);

        expect(fileEdits[0].newText).to.be.equal('# rubocop:disable Layout/FirstHashElementIndentation\n');
        range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
        expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));

        expect(fileEdits[1].newText).to.be.equal('\n# rubocop:enable Layout/FirstHashElementIndentation\n');
        range = new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0));
        expect(JSON.stringify(fileEdits[1].range)).to.be.equal(JSON.stringify(range));
      });

      it('shows the documentation for `Layout/FirstHashElementIndentation`', () => {
        expect(quickFixes[3].title).to.contain('Show documentation for `Layout/FirstHashElementIndentation`');
        expect(quickFixes[3].edit).to.be.equal(undefined);

        expect(quickFixes[3].command.command).to.be.equal('vscode.open');
        expect(quickFixes[3].command.title).to.be.equal('Show documentation for `Layout/FirstHashElementIndentation`');
        expect(quickFixes[3].command.arguments.length).to.be.equal(1);
        expect(quickFixes[3].command.arguments[0]).to.be.equal('https://docs.rubocop.org/rubocop/cops_layout.html#layoutfirsthashelementindentation');
      });

      it('forces fixing all', () => {
        expect(quickFixes[4].title).to.be.equal('Fix all warnings')
        expect(quickFixes[4].edit).to.be.equal(undefined);

        expect(quickFixes[4].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[4].command.title).to.be.equal('Fix all warnings');
        expect(quickFixes[4].command.arguments.length).to.be.equal(1);
        expect(quickFixes[4].command.arguments[0]).to.be.equal('-A');
      });

      it('fixes all safely', () => {
        expect(quickFixes[5].title).to.be.equal('Fix all warnings (safely)')
        expect(quickFixes[5].edit).to.be.equal(undefined);

        expect(quickFixes[5].command.command).to.be.equal('ruby.rubocop.autocorrect');
        expect(quickFixes[5].command.title).to.be.equal('Fix all warnings (safely)');
        expect(quickFixes[5].command.arguments).to.be.equal(undefined);
      });
    });

    it('ignores another cop in the same line', async function() {
      let range: vscode.Range;

      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_with_disabled_cop_for_line.rb',
        fixtures.rubyFileWithDisabledCopForLine
      );
      const editor = await helper.openFile(filePath);

      await helper.sleep(500);

      range = new vscode.Range(new vscode.Position(1, 13), new vscode.Position(1, 15));
      const diagnostic = new vscode.Diagnostic(
        range,
        'Use `&&` instead of `and`.',
        vscode.DiagnosticSeverity.Warning
      );
      diagnostic.source = '[Correctable](convention:Style/AndOr)';
      diagnostics.set(editor.document.uri, [diagnostic]);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const quickFixes: vscode.CodeAction[] = instance.provideCodeActions(editor.document, range);

      expect(quickFixes).to.be.instanceOf(Array);
      expect(quickFixes.length).to.be.equal(6);

      expect(quickFixes[1].title).to.be.equal('Ignore (line) `Style/AndOr`');

      expect(quickFixes[1].command.command).to.be.equal('ruby.rubocop');
      expect(quickFixes[1].command.title).to.be.equal('Lint the file with Rubocop');
      expect(quickFixes[1].command.arguments).to.be.equal(undefined);

      expect(quickFixes[1].edit).to.be.instanceOf(vscode.WorkspaceEdit);
      const fileEdits = quickFixes[1].edit.get(editor.document.uri);
      expect(fileEdits.length).to.be.equal(1);

      expect(fileEdits[0].newText).to.be.equal('if something and other and 4 # rubocop:disable Style/IfUnlessModifier, Style/AndOr');
      range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 82));
      expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));

      fs.unlinkSync(filePath);
    });

    it('disables another cop for file in the same line', async function() {
      let range: vscode.Range;

      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_with_disabled_cop_for_line.rb',
        fixtures.rubyFileWithDisabledCopForFile
      );
      const editor = await helper.openFile(filePath);

      await helper.sleep(500);

      range = new vscode.Range(new vscode.Position(1, 13), new vscode.Position(1, 15));
      const diagnostic = new vscode.Diagnostic(
        range,
        'Use `&&` instead of `and`.',
        vscode.DiagnosticSeverity.Warning
      );
      diagnostic.source = '[Correctable](convention:Style/AndOr)';
      diagnostics.set(editor.document.uri, [diagnostic]);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const quickFixes: vscode.CodeAction[] = instance.provideCodeActions(editor.document, range);

      expect(quickFixes).to.be.instanceOf(Array);
      expect(quickFixes.length).to.be.equal(6);

      expect(quickFixes[2].title).to.be.equal('Disable (file) `Style/AndOr`' );

      expect(quickFixes[2].command.command).to.be.equal('ruby.rubocop');
      expect(quickFixes[2].command.title).to.be.equal('Lint the file with Rubocop');
      expect(quickFixes[2].command.arguments).to.be.equal(undefined);

      expect(quickFixes[2].edit).to.be.instanceOf(vscode.WorkspaceEdit);
      const fileEdits = quickFixes[2].edit.get(editor.document.uri);
      expect(fileEdits.length).to.be.equal(2);

      expect(fileEdits[0].newText).to.be.equal('# rubocop:disable Style/IfUnlessModifier, Style/AndOr');
      range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 40));
      expect(JSON.stringify(fileEdits[0].range)).to.be.equal(JSON.stringify(range));

      expect(fileEdits[1].newText).to.be.equal('# rubocop:enable Style/IfUnlessModifier, Style/AndOr');
      range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 39));
      expect(JSON.stringify(fileEdits[1].range)).to.be.equal(JSON.stringify(range));

      fs.unlinkSync(filePath);
    });
  });
});
