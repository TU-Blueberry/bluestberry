import {Component, OnInit} from '@angular/core';
import { filter } from 'rxjs/operators';
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
        this.terminalOutput = this.terminalOutput +  (result + "\n");
    });

    this.pyodideService.getStdErr().pipe(
      filter(result => !result.toLowerCase().includes("syncfs operations in flight at once, probably just doing extra work".toLowerCase()))
    )
    .subscribe(result => {
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
