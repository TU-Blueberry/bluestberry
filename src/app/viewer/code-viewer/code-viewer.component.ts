import { Component, Input, OnInit } from '@angular/core'
import { PyodideService } from 'src/app/pyodide/pyodide.service'
import { EditorComponent } from 'ngx-monaco-editor'
import { editor } from 'monaco-editor'
import ICodeEditor = editor.ICodeEditor
import { FileTabDirective } from 'src/app/tab/file-tab.directive'
import {forkJoin, Subject} from 'rxjs'
import { concatMap, debounceTime, switchMap, tap } from 'rxjs/operators'
import {FilesystemService} from 'src/app/filesystem/filesystem.service';

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss'],
})
export class CodeViewerComponent implements OnInit {
  private editor!: ICodeEditor
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

  saveSubject = new Subject<void>()
  constructor(
    private pyodideService: PyodideService,
    private filesystemService: FilesystemService,
    private fileTabDirective: FileTabDirective
  ) {}

  ngOnInit(): void {
    this.fileTabDirective.dataChanges.subscribe((data) => {
      if (data) {
        this.code = new TextDecoder().decode(data.content)
      }
    })

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

  executeCode(): void {
    forkJoin([
      this.filesystemService.sync(false),
      this.pyodideService.runCode(this.code)
    ]).subscribe();
  }

  editorInit(editor: any) {
    this.editor = editor;
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
