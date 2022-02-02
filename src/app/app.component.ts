import { Component } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { About } from './actionbar/actions/about.action';
import { ExperienceEventsService } from './experience/experience-events.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'BluestBerry';
  isLoading = true;
  showAbout = false;
  settings$: Observable<any>;

  constructor(private ees: ExperienceEventsService, private store: Store) {
    this.ees.onExperienceOpened.pipe(delay(200)).subscribe(
      (exp) => this.isLoading = false, 
      (err: any) => console.error(err), 
      () => this.isLoading = false
    )

    this.settings$ = this.store.select(state => state.actionbar.about);
    this.settings$.subscribe(s => {
      this.showAbout = s.active
    });
  }

  closeAbout(): void {
   this.store.dispatch(new About.Close());
  }
}