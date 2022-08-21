import { expect } from 'chai';
import * as vscode from 'vscode';
import * as fs from 'fs';

import * as helper from './helper';
import * as fixtures from './fixtures';
import { Rubocop } from '../src/rubocop';

describe('Rubocop', () => {
  let instance: Rubocop;
  let diagnostics: vscode.DiagnosticCollection;

  beforeEach(() => {
    diagnostics = vscode.languages.createDiagnosticCollection();
    instance = new Rubocop(diagnostics);
  });

  describe('initialization', () => {
    describe('.diag', () => {
      it('is set to the provided DiagnosticCollection', () => {
        expect(instance).to.have.property('diag', diagnostics);
      });
    });
  });

  describe('autocorrectOnSave', () => {
    it('does not work on Ruby files when config option is disabled', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_with_warnings.rb',
        fixtures.rubyFileWithWarnings
      );
      const editor = await helper.openFile(filePath);
      expect(instance.executeAutocorrectOnSave()).to.be.equal(false);

      await helper.sleep(500);
      const fileAfterAutocorrect = editor.document?.getText();

      // Assert that there have been no changes
      expect(fileAfterAutocorrect).to.be.equal(fixtures.rubyFileWithWarnings);

      fs.unlinkSync(filePath);
    });

    it('does not work on non-Ruby files when config option is enabled', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      instance.config = {
        ...instance.config,
        onSave: true,
        autocorrectOnSave: true,
      };

      const filePath = helper.createTempFile(
        'test_file.js',
        fixtures.jsFile
      );
      const editor = await helper.openFile(filePath);
      expect(instance.executeAutocorrectOnSave()).to.be.equal(false);

      await helper.sleep(500);
      const fileAfterAutocorrect = editor.document?.getText();

      // Assert that there have been no changes
      expect(fileAfterAutocorrect).to.be.equal(fixtures.jsFile);

      fs.unlinkSync(filePath);
    });

    it('works on Ruby files when config option is enabled', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      instance.config = {
        ...instance.config,
        onSave: true,
        autocorrectOnSave: true,
      };

      const filePath = helper.createTempFile(
        'file_with_warnings.rb',
        fixtures.rubyFileWithWarnings
      );
      const editor = await helper.openFile(filePath);
      expect(instance.executeAutocorrectOnSave()).to.be.equal(true);

      await helper.sleep(500)
      const fileAfterAutocorrect = editor.document?.getText();

      // Assert that there have been changes
      expect(fileAfterAutocorrect).not.to.be.equal(fixtures.rubyFileWithWarnings);

      fs.unlinkSync(filePath);
    });
  });
});
