import {Component, OnInit} from '@angular/core';
import {PyodideService} from "../../pyodide/pyodide.service";

@Component({
  selector: 'app-terminal-viewer',
  templateUrl: './terminal-viewer.component.html',
  styleUrls: ['./terminal-viewer.component.scss']
})
export class TerminalViewerComponent implements OnInit {
  terminalOutput: string = 'Ausgabe:';
  error = false;

  constructor(private pyodideService: PyodideService) { }

  ngOnInit(): void {
    this.pyodideService.getStdOut().subscribe(result => {
        this.error = false;
        this.terminalOutput = this.terminalOutput +  ("\n" + result + "\n");
    });

    this.pyodideService.getStdErr().subscribe(result => {
        if (!this.error) { this.terminalOutput += "\nFehler: \n"; }
        this.error = true;
        this.terminalOutput += (result + "\n");
    });
  }

  clearOutput(): void {
    this.error = false;
    this.terminalOutput = 'Ausgabe:\n';
  }
}
