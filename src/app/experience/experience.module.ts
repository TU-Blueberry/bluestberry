import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceSelectionComponent } from './experience-selection/experience-selection.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { SandboxCreationComponent } from './sandbox-creation/sandbox-creation.component';

@NgModule({
  declarations: [ExperienceSelectionComponent, SandboxCreationComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  exports: [ExperienceSelectionComponent]
})
export class ExperienceModule { }
