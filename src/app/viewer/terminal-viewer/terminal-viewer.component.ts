import {Component, OnInit} from '@angular/core';
import {PyodideService} from "../../pyodide/pyodide.service";
import {filteredTerminalErrorPrefixes} from "./terminal-viewer.filtered-errors";

@Component({
  selector: 'app-terminal-viewer',
  templateUrl: './terminal-viewer.component.html',
  styleUrls: ['./terminal-viewer.component.scss']
})
export class TerminalViewerComponent implements OnInit {
  terminalOutput: string = 'Ausgabe:\n';
  importCache: string[] = [];             // Show import library messages just once
  error = false;                          // Whether last output was an error message

  constructor(private pyodideService: PyodideService) { }

  ngOnInit(): void {
    let importRegEx = new RegExp('loading \\w+');

    this.importCache = [];
    this.pyodideService.getStdOut().subscribe(stdOutput => {
      this.error = false;

      if(!this.importCache.includes(stdOutput)) {
        this.terminalOutput += (stdOutput + "\n");
      }

      if(stdOutput.match(importRegEx)) {
        this.importCache.push(stdOutput);
      }
    });

    this.pyodideService.getStdErr().subscribe(errorOutput => {
      for (let errorPrefix of filteredTerminalErrorPrefixes) {
        if (errorOutput.startsWith(errorPrefix)) { return; }
      }

      if (!this.error) {
        this.terminalOutput += "\nFehler: \n";
      }

      this.error = true;
      this.terminalOutput += (errorOutput + "\n");
    });
  }

  clearOutput(): void {
    this.error = false;
    this.terminalOutput = 'Ausgabe:\n';
  }
}
