import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LessonManagementService } from '../lesson-management/lesson-management.service';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './lesson-selection.component.html',
  styleUrls: ['./lesson-selection.component.scss']
})
export class LessonSelectionComponent {
  lessons: Observable<string[]>;
  selectedLesson: string = '';
  isSwitching = false;

  constructor(private lessonManagementService: LessonManagementService) {
    this.lessons = this.lessonManagementService.lessons$;
    this.lessons.pipe().subscribe(lessons => {
      console.log("Lessons: ", lessons)

      const preference = localStorage.getItem("lastLesson");

      if (preference && lessons.includes(preference)) {
        this.selectedLesson = preference;
      } else {
        localStorage.removeItem("lastLesson");
        this.selectedLesson = lessons.length > 0 ? lessons[0] : '';
      }

      if (this.selectedLesson !== '') {
        localStorage.setItem("lastLesson", this.selectedLesson);
        this.lessonManagementService.openLessonByName(this.selectedLesson).subscribe();
      }
    });
  }

  public onSelectChange(ev: Event) {
    const to = (ev.target as HTMLInputElement).value;
    this.isSwitching = true;
    this.lessonManagementService.changeLesson(this.selectedLesson, to).pipe(delay(1000)).subscribe(
      () => {}, (err: any) => { console.error(err); this.isSwitching = false }, () => {
        this.isSwitching = false;
        this.selectedLesson = to;
        localStorage.setItem("lastLesson", this.selectedLesson);
      }
    )
  }
}
