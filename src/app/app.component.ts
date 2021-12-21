import { Component } from '@angular/core';
import { delay } from 'rxjs/operators';
import { LessonEventsService } from './lesson/lesson-events.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'BluestBerry';
  isLoading = true;

  constructor(private lse: LessonEventsService) {
    this.lse.onLessonOpened.pipe(delay(1000)).subscribe(
      () => {this.isLoading = false}, 
      (err: any) => { console.error(err) }, 
      () => this.isLoading = false
    )   
  }
}
