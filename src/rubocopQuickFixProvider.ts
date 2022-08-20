import * as vscode from 'vscode';

const initialWhitespaceRegexp = /^\s+/
const correctableRegexp = /\[Correctable\]\([a-z]+:((\w|\/)+)\)$/;
// Group 1 is the name of the cop
const copFromMessageRegexp = /\([a-z]+:((\w|\/)+)\)$/;
// Group 1 is the code without the comment
// Group 5 is the comment
const rubyCommentRegexp = /^[\t ]*([^#"'\r\n]("(\\"|[^"])*"|'(\\'|[^'])*'|[^#\n\r])*)(#([^#\r\n]*))?/
// Group 2 is the list of cop names
const rubocopDisableRegexp = /(# )?rubocop:disable (((\w|\/)+)(,\s+((\w|\/)+))*)/

export default class RubocopQuickFixProvider
  implements vscode.CodeActionProvider
{
  private diag: vscode.DiagnosticCollection;

  constructor(diagnostics: vscode.DiagnosticCollection) {
    this.diag = diagnostics;
  }

  // This method is called whenever a rubocop warning
  // is hovered or when the cursor's position is changed.
  public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.ProviderResult<vscode.CodeAction[]> {
    const fileDiagnostics = this.diag.get(document.uri);
    if(fileDiagnostics === undefined || fileDiagnostics === null || fileDiagnostics.length == 0) return;

    const appliedDiagnostics = fileDiagnostics.filter((diagnostic) => {
      return undefined !== diagnostic.range.intersection(range)
    })

    let quickFixes: vscode.CodeAction[] = [];

    appliedDiagnostics.forEach((diagnostic) => {
      quickFixes = quickFixes.concat(this.createQuickFixes(document, diagnostic));
    })

    return quickFixes;
  }

  private createQuickFixes(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction[] {
    const quickFixes = []
    const copName = this.extractCopName(diagnostic);

    const autocorrectQuickFix = this.autocorrectCopInFile(copName, diagnostic);
    if(autocorrectQuickFix !== null) quickFixes.push(autocorrectQuickFix);

    quickFixes.push(this.ignoreCopForLineQuickFix(document, copName, diagnostic));

    const disableCopInRubocopYaml = this.disableCopInRubocopYaml(document, copName, diagnostic);
    if(disableCopInRubocopYaml !== null) quickFixes.push(disableCopInRubocopYaml);

    quickFixes.push(this.showCopDocumentation(copName, diagnostic));
    quickFixes.push(this.forceFixingAll(diagnostic));
    quickFixes.push(this.fixAllSafely(diagnostic));

    return quickFixes;
  }

  private forceFixingAll(diagnostic: vscode.Diagnostic): vscode.CodeAction {
    if(diagnostic.source?.match(correctableRegexp) === null) return null;

    const quickFix = new vscode.CodeAction('Force fixing all warnings', vscode.CodeActionKind.QuickFix);
    quickFix.command = {
      command: 'ruby.rubocop.autocorrect',
      title: 'Force fixing all warnings',
      arguments: ['-A']
    };

    return quickFix;
  }

  private fixAllSafely(diagnostic: vscode.Diagnostic): vscode.CodeAction {
    if(diagnostic.source?.match(correctableRegexp) === null) return null;

    const quickFix = new vscode.CodeAction(`Fix all warnings safely`, vscode.CodeActionKind.QuickFix);
    quickFix.command = {
      command: 'ruby.rubocop.autocorrect',
      title: `Fix all warnings safely`
    };

    return quickFix;
  }

  private showCopDocumentation(copName: string, diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const copNameArray = copName.split('/');
    const copDepartment = copNameArray[0].toLowerCase();
    const copId = copNameArray[1].toLowerCase();
    const docsUri = `https://docs.rubocop.org/rubocop/cops_${copDepartment}.html#${copDepartment}${copId}`;

    const quickFix = new vscode.CodeAction(`Show documentation for \`${copName}\``, vscode.CodeActionKind.QuickFix);
    quickFix.command = {
      command: 'vscode.open',
      title: `Show documentation for \`${copName}\``,
      arguments: [docsUri]
    };
    quickFix.diagnostics = [diagnostic];

    return quickFix;
  }

  private autocorrectCopInFile(copName: string, diagnostic: vscode.Diagnostic): vscode.CodeAction | null {
    if(diagnostic.source?.match(correctableRegexp) === null) return null;

    const quickFix = new vscode.CodeAction(`Fix \`${copName}\` in this file`, vscode.CodeActionKind.QuickFix);
    quickFix.command = {
      command: 'ruby.rubocop.autocorrect',
      title: `Fix \`${copName}\` in this file`,
      arguments: ['-A', '--only', copName]
    };
    quickFix.diagnostics = [diagnostic];

    return quickFix;
  }

  private disableCopInRubocopYaml(document: vscode.TextDocument, copName: string, diagnostic: vscode.Diagnostic): vscode.CodeAction | null {
    if(vscode.workspace.workspaceFolders === undefined) return null;

    const currentWorkspaceFolder = vscode.workspace.workspaceFolders.find((workspaceFolder) => {
      return document.uri.path.includes(workspaceFolder.uri.path);
    })

    if(currentWorkspaceFolder === undefined) return null;

    const quickFix = new vscode.CodeAction(`Disable \`${copName}\` for this project`, vscode.CodeActionKind.QuickFix);
    quickFix.diagnostics = [diagnostic];
    quickFix.command = {
      command: 'ruby.rubocop.disableCop',
      title: `Disable \`${copName}\` in \`.rubocop.yml\``,
      arguments: [currentWorkspaceFolder, copName]
    };

    return quickFix;
  }

  private ignoreCopForLineQuickFix(document: vscode.TextDocument, copName: string, diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const quickFix = new vscode.CodeAction(`Ignore \`${copName}\` for this line`, vscode.CodeActionKind.QuickFix);

    const lineNumber = diagnostic.range.start.line;
    const lineText = document.lineAt(lineNumber).text;
    let newCommentStartCharacter = lineText.length;
    let newCommentText = ` # rubocop:disable ${copName}`;

    const initialWhitespace = lineText.match(initialWhitespaceRegexp) || '';
    const existingCommentMatch = lineText.match(rubyCommentRegexp);
    const existingCommentText = existingCommentMatch[5];
    const codeWithoutComment = `${initialWhitespace}${existingCommentMatch[1]}`;

    if(existingCommentText !== undefined) {
      newCommentStartCharacter = 0
      const rubocopDisableMatch = existingCommentText.match(rubocopDisableRegexp);

      if(rubocopDisableMatch !== null) {
        newCommentText = `${codeWithoutComment}${rubocopDisableMatch[0]}, ${copName}`;
      } else {
        newCommentText = `${codeWithoutComment}${newCommentText.substring(1)}`;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    const editRange = new vscode.Range(
      new vscode.Position(lineNumber, newCommentStartCharacter),
      new vscode.Position(lineNumber, newCommentStartCharacter + newCommentText.length)
    );

    edit.replace(document.uri, editRange, newCommentText);
    quickFix.edit = edit;
    quickFix.command = { command: 'ruby.rubocop', title: 'Lint the file with Rubocop' };
    quickFix.diagnostics = [diagnostic]

    return quickFix;
  }

  private extractCopName(diagnostic: vscode.Diagnostic): string | null {
    const matches = diagnostic.source?.match(copFromMessageRegexp);
    if(matches === null) return null;

    return matches[1];
  }
}