import { AfterViewInit, Component, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  title = 'BluestBerry';
  startX = 0;
  startWidth = 0;
  unlistenMove!: () => void;
  unlistenMouseUp!: () => void;
  minCodeWidth = 100;
  showFiles = false;
  showOfficialFiles = false;
  showCustomFiles = false;
  expandedTests = false;
  showTestOverlay = false;

  minSimulationWidth = 100;
  // Example Binding to update the Unity Component, might be useful to swap scenes in the future.

  updateMessage: number = 1;

  constructor(private red: Renderer2, private window: Window) {}
  ngAfterViewInit(): void {
    throw new Error('Method not implemented.');
  }

  test(ev: any): void {
    this.unlistenMove = this.red.listen(
      'document',
      'mousemove',
      this.fn.bind(this)
    );
    this.unlistenMouseUp = this.red.listen('document', 'mouseup', (ev) => {
      console.log(ev);

      // remove event listeners as soon as dragging stopped
      this.unlistenMouseUp?.();
      this.unlistenMove?.();
    });

    const elem = document.getElementById('code-area');
    this.startWidth = elem!.clientWidth;
    this.startX = ev.clientX;
  }

  // setze width von code-area; block rechts daneben nimmt durch flexbox automatisch den übrigen platz ein
  // initial haben code und simulation gleiche breite (flex 1 1 auto)

  // alternative: alle elemente (action bar, code, slider, simulation) absolut positionieren
  // "left" berechnen (bei stackblitz z.B. via inset)
  code =
    'test test 123123 1 2 1 4j rlkajsdfölksjdfölkasjdf asd flkasjdflkajsdflkjasdf';
  fn(ev: any): void {
    // https://stackoverflow.com/questions/46931103/making-a-dragbar-to-resize-divs-inside-css-grids
    const maincontent = document.getElementById('main-content');
    const offset = maincontent!.offsetLeft;
    const relativeXpos = ev.clientX - offset;

    const actionbarWidth =
      document.getElementById('action-bar')?.clientWidth || 0;
    const sidebarWidth = document.getElementById('sidebar')?.clientWidth || 0;
    const simulationWidth =
      document.getElementById('simulation')?.clientWidth || 0;

    console.log(
      'ABW: ' +
        actionbarWidth +
        ' - SBW: ' +
        sidebarWidth +
        ' - SW: ' +
        simulationWidth
    );

    // code must leave enough space for actionbar, sidebar and the minimum width of the simulation
    // in other words, this is the maximum width the code area may have in order to fit all the other elements
    const maxCodeWidth =
      document.body.clientWidth -
      actionbarWidth -
      sidebarWidth -
      this.minSimulationWidth;
    const codearea = document.getElementById('code-area');

    // minCodeWidth specifies minimum width of code area
    if (codearea) {
      codearea.style.width =
        Math.min(Math.max(relativeXpos, this.minCodeWidth), maxCodeWidth) +
        'px';
      codearea.style.flexGrow = '0';
    }
  }

  toggleFiles(): void {
    this.showFiles = !this.showFiles;
  }

  toggleOfficialFiles(): void {
    this.showOfficialFiles = !this.showOfficialFiles;
  }

  toggleCustomFiles(): void {
    this.showCustomFiles = !this.showCustomFiles;
  }

  toggleTest(): void {
    this.expandedTests = !this.expandedTests;
  }

  redoTest(ev: any): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  toggleTestOverlay(): void {
    this.showTestOverlay = !this.showTestOverlay;
  }

  showTests(): void {
    this.showTestOverlay = true;
  }

  hideTests(): void {
    this.showTestOverlay = false;
  }

  stopEvent(ev: any): void {
    ev.stopPropagation();
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
