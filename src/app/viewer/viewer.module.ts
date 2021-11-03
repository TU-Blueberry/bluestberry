import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import { CodeViewerComponent } from './code-viewer/code-viewer.component';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';
import { MainViewerComponent } from './main-viewer/main-viewer.component';
import { TabViewComponent } from './tab-view/tab-view.component';
import { TabGroupComponent } from './tab-group/tab-group.component';

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
    MainViewerComponent,
    TabViewComponent,
    TabGroupComponent
  ],
    imports: [
        CommonModule,
        MonacoEditorModule,
        FormsModule
    ],
  exports: [
    CodeViewerComponent,
    MainViewerComponent
  ]
})
export class ViewerModule {
  constructor() {
  }
}

