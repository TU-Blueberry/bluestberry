import { Component, OnInit } from '@angular/core';
import { tap } from 'rxjs/operators';
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
  code = `
1+1
`;

  constructor(private pyodideService: PyodideService) { }

  ngOnInit(): void {

  }

  executeCode(): any | void {
    console.log(this);
    this.pyodideService.runCode(this.code)
      .subscribe( (res) => {console.log(res)})
  }

}
