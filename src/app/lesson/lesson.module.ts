import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonSelectionComponent } from './lesson-selection/lesson-selection.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { SandboxCreationComponent } from './sandbox-creation/sandbox-creation.component';
import { ModalComponent } from '../shared/modal/modal.component';

@NgModule({
  declarations: [LessonSelectionComponent, SandboxCreationComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  exports: [LessonSelectionComponent]
})
export class LessonModule { }
