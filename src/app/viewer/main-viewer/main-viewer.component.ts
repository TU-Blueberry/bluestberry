import { Component, OnInit } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit {
  filetreeVisible = true;

  constructor(private uiEv: UiEventsService) {
    this.uiEv.onFiletreeToggle.subscribe(next => this.filetreeVisible = next);
  }

  ngOnInit(): void {
  }

}
