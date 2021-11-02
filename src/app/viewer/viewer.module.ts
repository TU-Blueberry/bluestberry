import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import { CodeViewerComponent } from './code-viewer/code-viewer.component';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';
import { UnityViewerComponent } from './unity-viewer/unity-viewer.component';
import { ImageViewerComponent } from './image-viewer/image-viewer.component';

/**
 * Module used for all the Viewer-Components.
 * Basically everything that can show a File.
 * - CodeViewer
 * - CsvViewer
 * - UnityViewer
 * - PlotlyViewer
 * - ImageViewer
 * - DeckerViewer
 * - PdfViewer
 */

@NgModule({
  declarations: [
    CodeViewerComponent,
    UnityViewerComponent,
    ImageViewerComponent
  ],
    imports: [
        CommonModule,
        MonacoEditorModule,
        FormsModule
    ],
  exports: [
    CodeViewerComponent,
    UnityViewerComponent,
    ImageViewerComponent
  ]
})
export class ViewerModule {
  constructor() {
  }
}

