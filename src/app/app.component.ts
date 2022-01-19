import { Component } from '@angular/core';
import { delay } from 'rxjs/operators';
import { LessonEventsService } from './lesson/lesson-events.service';
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

  constructor(private lse: LessonEventsService, private uiEv: UiEventsService) {
    this.lse.onExperienceOpened.pipe(delay(1000)).subscribe(
      () => {this.isLoading = false}, 
      (err: any) => { console.error(err) }, 
      () => this.isLoading = false
    )

    this.uiEv.onAboutToggle.subscribe(show => this.showAbout = show);
  }

  closeAbout(): void {
    this.uiEv.toggleAbout(false);
  }
}
