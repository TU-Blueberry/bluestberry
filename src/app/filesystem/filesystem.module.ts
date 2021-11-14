import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiletreeComponent } from './filetree/filetree.component';
import { PyodideModule } from '../pyodide/pyodide.module';
import { FolderComponent } from './folder/folder.component';
import { FileComponent } from './file/file.component';
import { HttpClient, HttpHandler } from '@angular/common/http';

/**
 * Module for Filesystem-Management related Classes.
 * e.g. Filetree-Display, Import, Export etc.
 */

@NgModule({
  declarations: [
    FiletreeComponent,
    FolderComponent,
    FileComponent
  ],
  imports: [
    CommonModule,
    PyodideModule
  ],
  exports: [
    FiletreeComponent
  ]
})
export class FilesystemModule { }
