import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiletreeComponent } from './filetree/filetree.component';

/**
 * Module for Filesystem-Management related Classes.
 * e.g. Filetree-Display, Import, Export etc.
 */

@NgModule({
  declarations: [
    FiletreeComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FiletreeComponent
  ]
})
export class FilesystemModule { }
