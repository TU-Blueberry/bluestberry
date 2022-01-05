import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileIconsComponent } from './files/file-icons/file-icons.component';
import { LoadingAnimationComponent } from './loading-animation/loading-animation.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';

@NgModule({
  declarations: [
    FileIconsComponent,
    LoadingAnimationComponent,
    ConfirmationDialogComponent,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FileIconsComponent,
    LoadingAnimationComponent,
    ConfirmationDialogComponent
  ]
})
export class SharedModule { }
