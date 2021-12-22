import { Component, OnInit } from '@angular/core';
import { UiEventsService } from '../ui-events.service';

@Component({
  selector: 'app-actionbar',
  templateUrl: './actionbar.component.html',
  styleUrls: ['./actionbar.component.scss']
})
export class ActionbarComponent implements OnInit {
  showFiles = true;
  showTerminal = true;

  constructor(private uiEv: UiEventsService) { }

  ngOnInit(): void {
  }

  toggleFiles(): void {
    this.showFiles = !this.showFiles;
    this.uiEv.changeFiletree(this.showFiles);
  }

  openHints(): void {
    this.uiEv.changeHints();
  }

  toggleTerminal(): void {
    this.showTerminal = !this.showTerminal;
    this.uiEv.toggleTerminal();
  }

  startTour(): void {
    this.uiEv.startTour();
  }
}
