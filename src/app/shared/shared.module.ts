import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileIconsComponent } from './files/file-icons/file-icons.component';
import { LoadingAnimationComponent } from './loading-animation/loading-animation.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { ModalComponent } from './modal/modal.component';
import { AboutComponent } from './about/about.component';
import { ProgressSpinnerComponent } from './progress-spinner/progress-spinner.component';

@NgModule({
  declarations: [
    FileIconsComponent,
    LoadingAnimationComponent,
    ConfirmationDialogComponent,
    ModalComponent,
    AboutComponent,
    ProgressSpinnerComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FileIconsComponent,
    LoadingAnimationComponent,
    ConfirmationDialogComponent,
    ModalComponent,
    AboutComponent,
    ProgressSpinnerComponent
  ]
})
export class SharedModule { }
