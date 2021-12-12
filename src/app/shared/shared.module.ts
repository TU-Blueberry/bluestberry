import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileIconsComponent } from './files/file-icons/file-icons.component';
import { FileTypes } from './files/filetypes.enum';

@NgModule({
  declarations: [
    FileIconsComponent,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FileIconsComponent,
  ]
})
export class SharedModule { }
