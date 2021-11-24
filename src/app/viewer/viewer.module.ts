import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CodeViewerComponent } from './code-viewer/code-viewer.component'
import { MonacoEditorModule } from 'ngx-monaco-editor'
import { FormsModule } from '@angular/forms'
import { OverlayModule } from '@angular/cdk/overlay'
import { UnityViewerComponent } from './unity-viewer/unity-viewer.component'
import { UnityModule } from '../unity/unity.module'
import { TerminalViewerComponent } from './terminal-viewer/terminal-viewer.component'
import { LessonSelectionComponent } from './lesson-selection/lesson-selection.component'
import { ImageViewerComponent } from './image-viewer/image-viewer.component'
import { MainViewerComponent } from './main-viewer/main-viewer.component'
import { AngularSplitModule } from 'angular-split'
import { HintViewerComponent } from './hint-viewer/hint-viewer.component'
import { FilesystemModule } from '../filesystem/filesystem.module'
import { GlossaryEntryViewerComponent } from './glossary-entry-viewer/glossary-entry-viewer.component';
import { MarkdownModule } from "ngx-markdown";
import {TabModule} from 'src/app/tab/tab.module';

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
 * - LessonSelection
 */

@NgModule({
  declarations: [
    CodeViewerComponent,
    UnityViewerComponent,
    TerminalViewerComponent,
    LessonSelectionComponent,
    ImageViewerComponent,
    MainViewerComponent,
    HintViewerComponent,
    GlossaryEntryViewerComponent,
  ],
  imports: [
    CommonModule,
    MonacoEditorModule,
    FormsModule,
    UnityModule,
    AngularSplitModule,
    OverlayModule,
    FilesystemModule,
    MarkdownModule,
    TabModule,
  ],
  exports: [
    CodeViewerComponent,
    UnityViewerComponent,
    TerminalViewerComponent,
    ImageViewerComponent,
    MainViewerComponent,
  ],
})
export class ViewerModule {
  constructor() {}
}
