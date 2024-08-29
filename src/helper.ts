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
    const config = ['--config', extensionConfig.configFilePath];
    commandArguments = commandArguments.concat(config);
  }

  return commandArguments;
}
