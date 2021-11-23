import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiletreeComponent } from './filetree/filetree.component';
import { PyodideModule } from '../pyodide/pyodide.module';
import { FolderComponent } from './folder/folder.component';
import { FileComponent } from './file/file.component';
import { UserInputComponent } from './user-input/user-input.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonActionsComponent } from './common-actions/common-actions.component';

/**
 * Module for Filesystem-Management related Classes.
 * e.g. Filetree-Display, Import, Export etc.
 */

@NgModule({
  declarations: [
    FiletreeComponent,
    FolderComponent,
    FileComponent,
    UserInputComponent,
    CommonActionsComponent
  ],
  imports: [
    CommonModule,
    PyodideModule,
    FormsModule, 
    ReactiveFormsModule
  ],
  exports: [
    FiletreeComponent
  ]
})
export class FilesystemModule { }
