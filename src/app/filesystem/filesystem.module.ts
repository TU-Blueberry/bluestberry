import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiletreeComponent } from './filetree/filetree.component';
import { PyodideModule } from '../pyodide/pyodide.module';
import { FolderComponent } from './folder/folder.component';
import { FileComponent } from './file/file.component';
import { UserInputComponent } from './user-input/user-input.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonActionsComponent } from './common-actions/common-actions.component';
import { SharedModule } from '../shared/shared.module';
import { ExperienceModule } from '../experience/experience.module';
import { GlossaryPipe } from './glossary.pipe';

/**
 * Module for Filesystem-Management related Classes.
 * e.g. Filetree-Display, Import, Export etc.
 */

@NgModule({
  declarations: [
    FolderComponent,
    FileComponent,
    UserInputComponent,
    CommonActionsComponent,
    FiletreeComponent,
    GlossaryPipe
  ],
  imports: [
    CommonModule,
    PyodideModule,
    FormsModule, 
    ReactiveFormsModule,
    SharedModule,
    ExperienceModule
  ],
  exports: [
    FiletreeComponent
  ]
})
export class FilesystemModule { }
