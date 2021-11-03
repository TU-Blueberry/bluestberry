import { Component, OnInit, Renderer2 } from '@angular/core';
import { PyodideService } from 'src/app/pyodide/pyodide.service';

@Component({
  selector: 'app-unity-viewer',
  templateUrl: './unity-viewer.component.html',
  styleUrls: ['./unity-viewer.component.scss']
})
export class UnityViewerComponent {
  startX = 0;
  startWidth = 0;
  unlistenMove!: () => void;
  unlistenMouseUp!: () => void;
  minCodeWidth = 100;
  minSimulationWidth = 100;
  pythonResult = '';

  constructor(private red: Renderer2) {  }

  test(ev: any): void {
    this.unlistenMove = this.red.listen('document', 'mousemove', this.fn.bind(this));
    this.unlistenMouseUp = this.red.listen('document', 'mouseup', (ev) => {
      console.log(ev);

      // remove event listeners as soon as dragging stopped
      this.unlistenMouseUp?.();
      this.unlistenMove?.();
    });

    const elem = document.getElementById("code-area");
    this.startWidth = elem!.clientWidth;
    this.startX = ev.clientX;
  }

  // setze width von code-area; block rechts daneben nimmt durch flexbox automatisch den übrigen platz ein
  // initial haben code und simulation gleiche breite (flex 1 1 auto)

  // alternative: alle elemente (action bar, code, slider, simulation) absolut positionieren
  // "left" berechnen (bei stackblitz z.B. via inset)
  fn(ev: any): void {
    // https://stackoverflow.com/questions/46931103/making-a-dragbar-to-resize-divs-inside-css-grids
    const maincontent = document.getElementById("main-content");
    const offset = maincontent!.offsetLeft;
    const relativeXpos = ev.clientX - offset;

    const actionbarWidth = document.getElementById("action-bar")?.clientWidth || 0;;
    const sidebarWidth = document.getElementById("sidebar")?.clientWidth || 0;;
    const simulationWidth = document.getElementById("simulation")?.clientWidth || 0;

    console.log("ABW: " + actionbarWidth + " - SBW: " + sidebarWidth + " - SW: " + simulationWidth)


    // code must leave enough space for actionbar, sidebar and the minimum width of the simulation
    // in other words, this is the maximum width the code area may have in order to fit all the other elements
    const maxCodeWidth = document.body.clientWidth - actionbarWidth - sidebarWidth - this.minSimulationWidth;
    const codearea = document.getElementById("code-area");

    // minCodeWidth specifies minimum width of code area
    if (codearea) {
      codearea.style.width = Math.min((Math.max(relativeXpos, this.minCodeWidth)), maxCodeWidth) + 'px';
      codearea.style.flexGrow = "0";
    }
  }
}
