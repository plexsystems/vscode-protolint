import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import * as path from 'path';
import * as net from 'net';

import { FAILOVER_PATH, PATH_CONFIGURATION_KEY } from './constants';
import { ProtoError, parseProtoError } from './protoError';

export interface LinterError {
  proto: ProtoError;
  range: vscode.Range;
}

export default class Linter {
  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
  }

  /**
   * A method for testing `protolint` executable via `version` command.
   * 
   * @param path - path/softlink to `protolint` executable.
   * @returns `true` if the `version` command is completed, otherwise `false`.
   */
  public static isExecutableValid(path: string): boolean {
    const result = cp.spawnSync(path, ['version']);
    if (result.status !== 0) {
      return false;
    }

    return true;
  }

  /**
   * Gets `protolint` executable path/softlink from the workspace configuration 
   * and tests it via {@link isExecutableValid}.
   * @returns `undefined` when the executable isn't available, otherwise 
   * path/softlink to executable.
   */
  public static isExecutableAvailable(): string | undefined {
    let executablePath = vscode.workspace.getConfiguration('protolint').get<string>(PATH_CONFIGURATION_KEY);
    if (!executablePath) {
      // Failover when the key is missing in the configuration.
      executablePath = FAILOVER_PATH;
    }

    if (this.isExecutableValid(executablePath)) {
      return executablePath;
    }

    return undefined;
  }

  /**
   * Returns a path for 
   * {@link https://nodejs.org/docs/latest-v18.x/api/net.html#ipc-support | IPC connection} 
   * to convey the current document text to the linter without saving the file.
   * 
   * @remarks
   * 
   * The path is platform-dependent and has the following structure: 
   * `/{prefix}/{timestamp}/{doc_version}/{basename}`.
   * 
   * Value examples:
   * - Windows: `\\\\?\\pipe\\1681751977527\\1\\my.proto`
   * - others: `/tmp/1681751977527/1/my.proto`
   * 
   * @returns an IPC connection path to get the text
   */
  protected generateIpcPath(): string {
    const prefix: string = process.platform === 'win32' ? '\\\\?\\pipe' : '/tmp';

    let name: string = path.basename(this.codeDocument.fileName);
    if (this.codeDocument.isUntitled) {
      name += '.proto';
    }

    return path.join(
      prefix,
      Date.now().toString(),
      this.codeDocument.version.toString(),
      name
    );
  }

  public async lint(): Promise<LinterError[]> {
    const executablePath = vscode.workspace.getConfiguration('protolint').get<string>(PATH_CONFIGURATION_KEY);
    if (!executablePath) {
      return [];
    }

    let result = '';

    this.codeDocument.uri.scheme === 'file' &&
      !this.codeDocument.isClosed &&
      !this.codeDocument.isDirty ?
      result = await this.runFileLint(executablePath) :
      // Convey the text via IPC when `codeDocument` has unsaved changes.
      result = await this.runIpcLint(executablePath);

    if (!result) {
      return [];
    }

    const lintingErrors: LinterError[] = this.parseErrors(result);

    // When errors exist, but no linting errors were returned show the error window
    // in VSCode as it is most likely an issue with the binary itself such as not being
    // able to find a configuration or a file to lint.
    if (lintingErrors.length === 0) {
      vscode.window.showErrorMessage("protolint: " + result);
      return [];
    }

    return lintingErrors;
  }

  /**
   * Stable.
   * Attempts to lint {@link codeDocument}, passing its text via file URI.
   * Uses `cp.exec`.
   * 
   * @param executablePath - path/softlink to `protolint` executable
   * @returns `stderr` text (if any), otherwise `""`
   */
  private async runFileLint(executablePath: string): Promise<string> {
    if (!vscode.workspace.workspaceFolders) {
      return "";
    }

    let currentFile = this.codeDocument.uri.fsPath;
    let currentDirectory = path.dirname(currentFile);

    const cmd = `${executablePath} lint "${currentFile}"`;

    // Execute the protolint binary and store the output from standard error.
    //
    // The output could either be an error from using the binary improperly, such as unable to find
    // a configuration, or linting errors.
    const exec = util.promisify(cp.exec);
    let lintResults: string = "";

    await exec(cmd, {
      cwd: currentDirectory
    }).catch((error: any) => lintResults = error.stderr);

    return lintResults;
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((errors: LinterError[], currentError: string) => {
      const parsedError = parseProtoError(currentError);
      if (!parsedError.reason) {
        return errors;
      }

      const linterError: LinterError = {
        proto: parsedError,
        range: this.codeDocument.lineAt(parsedError.line - 1).range
      };

      return errors.concat(linterError);
    }, []);

    return result;
  }

  /**
   * Experimental.
   * Attempts to lint {@link codeDocument}, passing its text via
   * {@link https://nodejs.org/docs/latest-v18.x/api/net.html#ipc-support | IPC connection}.
   * 
   * @remarks
   * 
   * This method is supposed for real-time linting, so it uses `cp.execFile` that has no 
   * shell spawning overhead.
   * 
   * @param executablePath - path/softlink to `protolint` executable
   * @returns `stderr` text (if any), otherwise `""`
   */
  private async runIpcLint(executablePath: string): Promise<string> {
    const server = net.createServer(this.serverConnectionListener.bind(this));
    server.on("error", this.serverErrorListener);
    const ipcPath = this.generateIpcPath();
    server.listen(ipcPath);

    let lintResults: string = "";

    const execFile = util.promisify(cp.execFile);
    if (executablePath) {
      await execFile(
        executablePath,
        ['lint', ipcPath]
      ).catch((error: any) => lintResults = error.stderr);
    }

    server.unref();
    server.close(this.serverCloseCallback);

    return lintResults;
  }

  /**
   * Listener for the 
   * {@link https://nodejs.org/docs/latest-v18.x/api/net.html#ipc-support | IPC} 
   * `"connection"` event in {@link net.Server}.
   * 
   * @param clientSocket - a {@link net.Socket} where the client attempts to read the text for linting.
   */
  private serverConnectionListener(clientSocket: net.Socket): void {
    if (clientSocket.writable) {
      clientSocket.end(this.codeDocument.getText());
    }
    return;
  }

  /**
   * Listener for the 
   * {@link https://nodejs.org/docs/latest-v18.x/api/net.html#ipc-support | IPC} 
   * `"error"` event from {@link net.Server}.
   */
  private serverErrorListener(err: Error) {
    console.error(`server error: ${err}`);
    return;
  }

  /**
   * The callback when {@link net.Server} is closed.
   * @param err - error, if any.
   */
  private serverCloseCallback(err: Error | undefined): void {
    if (err) {
      console.error(err);
    }
    return;
  }
}
