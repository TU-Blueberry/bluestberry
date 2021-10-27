import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

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
  declarations: [],
  imports: [
    CommonModule
  ],
})
export class ViewerModule {
  constructor() {
  }
}

