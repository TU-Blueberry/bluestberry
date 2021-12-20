import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileIconsComponent } from './files/file-icons/file-icons.component';
import { LoadingAnimationComponent } from './loading-animation/loading-animation.component';

@NgModule({
  declarations: [
    FileIconsComponent,
    LoadingAnimationComponent,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FileIconsComponent,
    LoadingAnimationComponent
  ]
})
export class SharedModule { }
