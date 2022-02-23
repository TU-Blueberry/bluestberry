import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import { FormsModule } from '@angular/forms'
import { OverlayModule } from '@angular/cdk/overlay'
import { MatSortModule } from '@angular/material/sort'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MonacoEditorModule } from 'ngx-monaco-editor'
import { CodeViewerComponent } from './code-viewer/code-viewer.component'
import { UnityViewerComponent } from './unity-viewer/unity-viewer.component'
import { UnityModule } from '../unity/unity.module'
import { TerminalViewerComponent } from './terminal-viewer/terminal-viewer.component'
import { ImageViewerComponent } from './image-viewer/image-viewer.component'
import { MainViewerComponent } from './main-viewer/main-viewer.component'
import { AngularSplitModule } from 'angular-split'

import { HintViewerComponent } from './hint-viewer/hint-viewer.component'
import { FilesystemModule } from '../filesystem/filesystem.module'
import { MarkdownViewerComponent } from "./markdown-viewer/markdown-viewer.component";
import { MarkdownModule } from "ngx-markdown";
import { TabModule } from 'src/app/tab/tab.module';
import {TabGroupFacadeComponent} from 'src/app/viewer/tab-group-facade/tab-group-facade.component';
import { TableViewerComponent } from './table-viewer/table-viewer.component';
import { PblNgridConfigService, PblNgridModule } from '@pebula/ngrid';
import { PblNgridTargetEventsModule } from '@pebula/ngrid/target-events';
import { EmptyViewerComponent } from './empty-viewer/empty-viewer.component';
import { PlotlyViewerComponent } from './plotly-viewer/plotly-viewer.component';
import { PblNgridMatSortModule } from '@pebula/ngrid-material/sort';
import { PblNgridTransposeModule } from '@pebula/ngrid/transpose';
import { PblNgridStatePluginModule } from '@pebula/ngrid/state';
import { PblNgridDragModule } from '@pebula/ngrid/drag';


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
    HintViewerComponent,
    MarkdownViewerComponent,
    TabGroupFacadeComponent,
    TableViewerComponent,
    PlotlyViewerComponent,
    EmptyViewerComponent,
    PlotlyViewerComponent,
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
    MatSortModule,
    BrowserAnimationsModule,
    PblNgridModule,
    PblNgridTargetEventsModule,
    PblNgridTargetEventsModule,
    PblNgridMatSortModule,
    PblNgridTransposeModule,
    PblNgridStatePluginModule,
    PblNgridDragModule.withDefaultTemplates()
    
  ],
  exports: [
    CodeViewerComponent,
    UnityViewerComponent,
    TerminalViewerComponent,
    ImageViewerComponent,
    HintViewerComponent,
    MainViewerComponent,
  ],
})
export class ViewerModule {
  constructor(config: PblNgridConfigService) {
    config.set('targetEvents', {autoEnable: true});
  }
}
