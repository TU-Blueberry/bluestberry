import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CodeViewerComponent } from './code-viewer/code-viewer.component'
import { MonacoEditorModule } from 'ngx-monaco-editor'
import { FormsModule } from '@angular/forms'
import { UnityViewerComponent } from './unity-viewer/unity-viewer.component'
import { UnityModule } from '../unity/unity.module'
import { TerminalViewerComponent } from './terminal-viewer/terminal-viewer.component'
import { ImageViewerComponent } from './image-viewer/image-viewer.component';
import {MainViewerComponent} from './main-viewer/main-viewer.component';
import {TabViewComponent} from './tab-view/tab-view.component';
import {TabGroupComponent} from './tab-group/tab-group.component';
import {AngularSplitModule} from 'angular-split';

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
    TerminalViewerComponent,
    ImageViewerComponent,
    MainViewerComponent,
    TabViewComponent,
    TabGroupComponent
  ],
  imports: [CommonModule, MonacoEditorModule, FormsModule, UnityModule, AngularSplitModule],
  exports: [CodeViewerComponent, UnityViewerComponent, TerminalViewerComponent, ImageViewerComponent],
})
export class ViewerModule {
  constructor() {}
}
