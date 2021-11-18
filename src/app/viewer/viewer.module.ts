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
import { TabComponent } from 'src/app/viewer/tab/tab.component'
import { TabGroupComponent } from './tab-group/tab-group.component'
import { AngularSplitModule } from 'angular-split'
import { HintViewerComponent } from './hint-viewer/hint-viewer.component'
import { GlossaryEntryViewerComponent } from './glossary-entry-viewer/glossary-entry-viewer.component';
import { MarkdownModule } from "ngx-markdown";

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
    TabComponent,
    TabGroupComponent,
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
    MarkdownModule,
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
