import * as cp from 'child_process';
import * as vscode from 'vscode';
import { ExecFileException } from 'child_process';

import { RubocopOutput, RubocopFile, RubocopOffense } from './rubocopOutput';
import { TaskQueue, Task } from './taskQueue';
import { getConfig, RubocopConfig } from './configuration';
import RubocopAutocorrectProvider from './rubocopAutocorrectProvider';
import { getCommandArguments, isFileUri, getCurrentPath } from './helper';

export class Rubocop {
  public config: RubocopConfig;
  public formattingProvider: RubocopAutocorrectProvider;
  private diag: vscode.DiagnosticCollection;
  private additionalArguments: string[];
  private taskQueue: TaskQueue = new TaskQueue();

  constructor(
    diagnostics: vscode.DiagnosticCollection,
    additionalArguments: string[] = []
  ) {
    this.diag = diagnostics;
    this.additionalArguments = additionalArguments;
    this.config = getConfig();
    this.formattingProvider = new RubocopAutocorrectProvider();
  }

  public executeAutocorrectOnSave(): boolean {
    const document = vscode.window.activeTextEditor?.document;
    if (document === null || document === undefined) return false;
    if ((document.languageId !== 'gemfile' && document.languageId !== 'ruby') || document.isUntitled || !isFileUri(document.uri)) return false;
    if (!this.isOnSave || !this.autocorrectOnSave) return false;

    return this.executeAutocorrect();
  }

  public executeAutocorrect(): boolean {
    vscode.window.activeTextEditor?.edit((editBuilder) => {
      const document = vscode.window.activeTextEditor.document;
      const edits =
        this.formattingProvider.provideDocumentFormattingEdits(document);
      // We only expect one edit from our formatting provider.
      if (edits.length === 1) {
        const edit = edits[0];
        editBuilder.replace(edit.range, edit.newText);
      }
      if (edits.length > 1) {
        throw new Error(
          'Unexpected error: Rubocop document formatter returned multiple edits.'
        );
      }
    });

    return true;
  }

  public execute(document: vscode.TextDocument, onComplete?: () => void): void {
    if (
      (document.languageId !== 'gemfile' && document.languageId !== 'ruby') ||
      document.isUntitled ||
      !isFileUri(document.uri)
    ) {
      // git diff has ruby-mode. but it is Untitled file.
      return;
    }

    const fileName = document.fileName;
    const uri = document.uri;
    const currentPath = getCurrentPath(uri);

    const onDidExec = (error: Error, stdout: string, stderr: string) => {
      this.reportError(error, stderr);
      const rubocop = this.parse(stdout);
      if (rubocop === undefined || rubocop === null) {
        return;
      }

      try {
        this.diag.delete(uri);
      } catch (e) {
        console.debug('Deleting diagnostics failed');
      }

      const entries: [vscode.Uri, vscode.Diagnostic[]][] = [];
      rubocop.files.forEach((file: RubocopFile) => {
        const diagnostics = [];
        file.offenses.forEach((offence: RubocopOffense) => {
          const loc = offence.location;
          const range = new vscode.Range(
            loc.line - 1,
            loc.column - 1,
            loc.line - 1,
            loc.length + loc.column - 1
          );
          const sev = this.severity(offence.severity);
          const message = `${offence.message} (${offence.severity}:${offence.cop_name})`;
          const diagnostic = new vscode.Diagnostic(range, message, sev);
          diagnostics.push(diagnostic);
        });
        entries.push([uri, diagnostics]);
      });

      try {
        this.diag.set(entries);
      } catch (e) {
        console.debug('Adding diagnostics failed');
      }
    };

    const jsonOutputFormat = ['--format', 'json'];
    const args = getCommandArguments(fileName)
      .concat(this.additionalArguments)
      .concat(jsonOutputFormat);

    const task = new Task(uri, (token) => {
      const process = this.executeRubocop(
        args,
        document.getText(),
        { cwd: currentPath },
        (error, stdout, stderr) => {
          if (token.isCanceled) {
            return;
          }
          onDidExec(error, stdout, stderr);
          token.finished();
          if (onComplete) {
            onComplete();
          }
        }
      );
      return () => process.kill();
    });
    this.taskQueue.enqueue(task);
  }

  public get isOnSave(): boolean {
    return this.config.onSave;
  }

  public get autocorrectOnSave(): boolean {
    return this.config.autocorrectOnSave;
  }

  public clear(document: vscode.TextDocument): void {
    const uri = document.uri;
    if (isFileUri(uri)) {
      this.taskQueue.cancel(uri);
      this.diag.delete(uri);
    }
  }

  // execute rubocop
  private executeRubocop(
    args: string[],
    fileContents: string,
    options: cp.ExecOptions,
    cb: (err: Error, stdout: string, stderr: string) => void
  ): cp.ChildProcess {
    let child;
    if (this.config.useBundler) {
      child = cp.exec(`${this.config.command} ${args.join(' ')}`, options, cb);
    } else {
      child = cp.execFile(this.config.command, args, options, cb);
    }
    child.stdin.write(fileContents);
    child.stdin.end();
    return child;
  }

  // parse rubocop(JSON) output
  private parse(output: string): RubocopOutput | null {
    let rubocop: RubocopOutput;
    if (output.length < 1) {
      const message = `command ${this.config.command} returns empty output! please check configuration.`;
      vscode.window.showWarningMessage(message);

      return null;
    }

    try {
      rubocop = JSON.parse(output);
    } catch (e) {
      if (e instanceof SyntaxError) {
        const regex = /[\r\n \t]/g;
        const message = output.replace(regex, ' ');
        const errorMessage = `Error on parsing output (It might non-JSON output) : "${message}"`;
        vscode.window.showWarningMessage(errorMessage);

        return null;
      }
    }

    return rubocop;
  }

  // checking rubocop output has error
  private reportError(error: ExecFileException, stderr: string): boolean {
    const errorOutput = stderr.toString();
    if (error && error.code === 'ENOENT') {
      vscode.window.showWarningMessage(
        `${this.config.command} is not executable`
      );
      return true;
    } else if (error && error.code === 127) {
      vscode.window.showWarningMessage(stderr);
      return true;
    } else if (errorOutput.length > 0 && !this.config.suppressRubocopWarnings) {
      vscode.window.showWarningMessage(stderr);
      return true;
    }

    return false;
  }

  private severity(sev: string): vscode.DiagnosticSeverity {
    switch (sev) {
      case 'refactor':
        return vscode.DiagnosticSeverity.Hint;
      case 'convention':
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'fatal':
        return vscode.DiagnosticSeverity.Error;
      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }
}
