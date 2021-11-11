import {Component, Input, OnInit} from '@angular/core';
import {PyodideService} from "../../pyodide/pyodide.service";

@Component({
  selector: 'app-terminal-viewer',
  templateUrl: './terminal-viewer.component.html',
  styleUrls: ['./terminal-viewer.component.scss']
})
export class TerminalViewerComponent implements OnInit {
  terminalOutput: string = 'Ausgabe:\n';

  constructor(private pyodideService: PyodideService) { }

  ngOnInit(): void {
    this.pyodideService.getStdOut().subscribe(
      result => this.terminalOutput += (result + "\n")
    );
  }

  clearOutput(): void {
    this.terminalOutput = 'Ausgabe:\n\n';
  }
}
