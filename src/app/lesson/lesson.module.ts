import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonSelectionComponent } from './lesson-selection/lesson-selection.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [LessonSelectionComponent],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [LessonSelectionComponent]
})
export class LessonModule { }
