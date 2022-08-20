import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { getConfig } from './configuration';

export function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === 'file';
}

export function getCurrentPath(fileUri: vscode.Uri): string {
  const wsfolder = vscode.workspace.getWorkspaceFolder(fileUri);
  return (wsfolder && wsfolder.uri.fsPath) || path.dirname(fileUri.fsPath);
}

// extract argument to an array
export function getCommandArguments(fileName: string): string[] {
  let commandArguments = ['--stdin', fileName, '--force-exclusion'];
  const extensionConfig = getConfig();
  if (extensionConfig.configFilePath !== '') {
    const found = [extensionConfig.configFilePath]
      .concat(
        (vscode.workspace.workspaceFolders || []).map((ws) =>
          path.join(ws.uri.path, extensionConfig.configFilePath)
        )
      )
      .filter((p: string) => fs.existsSync(p));

    if (found.length == 0) {
      vscode.window.showWarningMessage(
        `${extensionConfig.configFilePath} file does not exist. Ignoring...`
      );
    } else {
      if (found.length > 1) {
        vscode.window.showWarningMessage(
          `Found multiple files (${found}) will use ${found[0]}`
        );
      }
      const config = ['--config', found[0]];
      commandArguments = commandArguments.concat(config);
    }
  }

  return commandArguments;
}