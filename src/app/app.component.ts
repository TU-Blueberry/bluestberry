import { Component } from '@angular/core';
import { delay } from 'rxjs/operators';
import { ExperienceEventsService } from './experience/experience-events.service';
import { UiEventsService } from './ui-events.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'BluestBerry';
  isLoading = true;
  showAbout = false;

  constructor(private ees: ExperienceEventsService, private uiEv: UiEventsService) {
    this.ees.onExperienceOpened.pipe(delay(200)).subscribe(
      (exp) => this.isLoading = false, 
      (err: any) => console.error(err), 
      () => this.isLoading = false
    )

    this.uiEv.onAboutToggle.subscribe(show => this.showAbout = show);
  }

  closeAbout(): void {
    this.uiEv.toggleAbout(false);
  }
}
