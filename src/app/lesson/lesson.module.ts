import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonSelectionComponent } from './lesson-selection/lesson-selection.component';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [LessonSelectionComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule
  ],
  exports: [LessonSelectionComponent]
})
export class LessonModule { }
