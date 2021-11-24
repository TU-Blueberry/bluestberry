import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './lesson-selection.component.html',
  styleUrls: ['./lesson-selection.component.scss']
})
export class LessonSelectionComponent implements OnInit {
  lessons: string[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getLessonList().subscribe(lessons => this.lessons = lessons);
  }

  getLessonList(): Observable<string[]> {
    return this.http.get<string[]>('/assets/lessons.json');
  }

  getLessonAsZip(lessonName: string): Observable<ArrayBuffer> {
    return this.http.get(`/assets/${lessonName}.zip`, { responseType: 'arraybuffer' });
  }
}
