import { Component, OnInit } from '@angular/core'
import { PyodideService } from 'src/app/pyodide/pyodide.service'
import { EditorComponent } from 'ngx-monaco-editor'
import { editor } from 'monaco-editor'
import ICodeEditor = editor.ICodeEditor

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
  code = `import numpy as np
import js as js

#initialize an array
arr = np.array([[11, 11, 9, 9],
                  [11, 0, 2, 0]])

# get array shape
shape = arr.shape

# Send both a list of classifications for a list of Testdata as an 
# example for classificator outputs.
#js.sendClassification('1,1,1,0,0')
#js.sendTraits('1,1,1,1,0')

print(shape)`

  constructor(private pyodideService: PyodideService) {}

  ngOnInit(): void {}

  executeCode(): void {
    this.pyodideService.runCode(this.code).subscribe()
  }

  editorInit(editor: any) {
    this.editor = editor
  }

  undo(): void {
    this.editor?.trigger(null, 'undo', '')
  }

  redo(): void {
    this.editor?.trigger(null, 'redo', '')
  }
}
