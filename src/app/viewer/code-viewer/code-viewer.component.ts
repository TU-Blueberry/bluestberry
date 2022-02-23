import { Component, Input, OnInit } from '@angular/core'
// import { listen } from '@codingame/monaco-jsonrpc';
import * as monaco from 'monaco-editor-core'

import { PyodideService } from 'src/app/pyodide/pyodide.service'
import { EditorComponent, NgxEditorModel } from 'ngx-monaco-editor'
import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import { MonacoLanguageClient, CloseAction, ErrorAction, MonacoServices, createConnection } from 'monaco-languageclient';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { editor } from 'monaco-editor'
import ICodeEditor = editor.ICodeEditor
import { FileTabDirective } from 'src/app/tab/file-tab.directive'
import {forkJoin, Subject} from 'rxjs'
import { concatMap, debounceTime, tap } from 'rxjs/operators'
import {FilesystemService} from 'src/app/filesystem/filesystem.service';

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss'],
})

export class CodeViewerComponent implements OnInit {
  private editor!: any
  editorOptions = {
    theme: 'vs-dark',
    language: 'python',
    lineNumbersMinChars: 3,
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  }
  
  code = ""
  isExecutableCode = false;
  languageId = "python";

  saveSubject = new Subject<void>()
  constructor(
    private pyodideService: PyodideService,
    private fileTabDirective: FileTabDirective,
    private filesystemService: FilesystemService
  ) {
    monaco.languages.register({
      id: 'python',
      extensions: ['.py', '.pyc', '.jupyter'],
      aliases: ['Python', 'PYTHON', 'PyLang']
    });
  }

  ngOnInit(): void {
    this.fileTabDirective.dataChanges.subscribe((data) => {
      if (data) {
        this.code = new TextDecoder().decode(data.content);
      }
    });
    this.fileTabDirective.propertyChanges.subscribe(tab => {
      this.isExecutableCode = tab.path.endsWith(".py");
    });

    this.saveSubject
      .pipe(
        debounceTime(1000),
        tap(() => console.log('save file observable')),
        concatMap(() =>
          this.fileTabDirective.saveCurrentFile(
            new TextEncoder().encode(this.code)
          )
        )
      )
      .subscribe(() => {
        console.log('saved file')
      })
  }

  terminateCode() {
    this.pyodideService.terminateCode(5000).subscribe();
  }

  executeCode(): void {
    forkJoin([
      this.filesystemService.sync(false),
      this.pyodideService.runCode(this.code)
    ]).subscribe();
  }

  editorInit(editor: any) {
    editor.getModeId = function(){return editor._languageId; }
    this.editor = editor
    MonacoServices.install(editor);
    // create the web socket
    const url = this.createUrl();
    const webSocket = this.createWebSocket(url);
    // listen when the web socket is opened
    listen({
      webSocket,
      onConnection: (connection: MessageConnection) => {
        // create and start the language client
        
        const languageClient = this.createLanguageClient(connection);
        const disposable = languageClient.start();
        connection.onClose(() => disposable.dispose());
      }
    });
  }

  public createUrl(): string {
    return 'ws://localhost:3000/python';
  }
  

  public createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
    return new MonacoLanguageClient({
      name: `BB Monaco Client`,
      clientOptions: {
        // use a language id as a document selector
        documentSelector: [this.languageId],
        // disable the default error handler
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart
        }
      },
      // create a language client connection from the JSON RPC connection on demand
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          return Promise.resolve(createConnection(<any>connection, errorHandler, closeHandler));
        }
      }
    });
  }

  public createWebSocket(socketUrl: string): any {
    const socketOptions = {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: Infinity,
      debug: false
    };
    return new ReconnectingWebSocket(socketUrl, [], socketOptions);    
  }

  undo(): void {
    this.editor?.trigger(null, 'undo', '')
  }

  redo(): void {
    this.editor?.trigger(null, 'redo', '')
  }

  save(): void {
    this.saveSubject.next()
  }
}
