import { expect } from 'chai';
import * as vscode from 'vscode';
import * as fs from 'fs';

import * as helper from './helper';
import { fileWithWarnings } from './fixtures';
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
    it('does not work when config option is disabled', async function () {
      this.timeout(5000);
      await helper.closeAllEditors();

      const filePath = helper.createTempFile(
        'file_with_warnings.rb',
        fileWithWarnings
      );
      await helper.openFile(filePath);
      expect(instance.executeAutocorrectOnSave()).to.be.equal(false);

      await helper.sleep(1000);
      const fileAfterAutocorrect =
        vscode.window.activeTextEditor?.document?.getText();

      // Assert that there have been no changes
      expect(fileAfterAutocorrect).to.be.equal(fileWithWarnings);

      fs.unlinkSync(filePath);
    });

    it('works when config option is enabled', async () => {
      await helper.closeAllEditors();

      instance.config = {
        ...instance.config,
        onSave: true,
        autocorrectOnSave: true,
      };

      const filePath = helper.createTempFile(
        'file_with_warnings.rb',
        fileWithWarnings
      );
      await helper.openFile(filePath);
      expect(instance.executeAutocorrectOnSave()).to.be.equal(true);

      const fileAfterAutocorrect =
        vscode.window.activeTextEditor?.document?.getText();

      // Assert that there have been changes
      expect(fileAfterAutocorrect).not.to.be.equal(fileWithWarnings);

      fs.unlinkSync(filePath);
    });
  });
});
