import { Component, OnInit } from '@angular/core';
import { PyodideService } from 'src/app/pyodide/pyodide.service';

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss']
})
export class CodeViewerComponent implements OnInit {

  editorOptions = {
    theme: 'vs-dark',
    language: 'python',
    lineNumbersMinChars: 3,
    automaticLayout: true,
    minimap: {
      enabled: false
    }
  };
  code =
`import numpy as np

#initialize an array
arr = np.array([[11, 11, 9, 9],
                  [11, 0, 2, 0]])

# get array shape
shape = arr.shape

print(shape)`
;

  constructor(private pyodideService: PyodideService) { }

  ngOnInit(): void { }

  executeCode(): void {
    this.pyodideService.runCode(this.code).subscribe();
  }
}
