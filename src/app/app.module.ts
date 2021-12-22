import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { setupPythonCalls } from './python-callable/python-callable.decorator';
import { ViewerModule } from './viewer/viewer.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { FormsModule } from '@angular/forms';
import { FilesystemModule } from './filesystem/filesystem.module';
import { NavbarComponent } from './navbar/navbar.component';
import { ActionbarComponent } from './actionbar/actionbar.component';
import { UnityModule } from './unity/unity.module';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AngularSplitModule} from 'angular-split';
import {GuidedTourModule, GuidedTourService} from 'ngx-guided-tour';
import { MarkdownModule, MarkedOptions, MarkedRenderer } from "ngx-markdown";
import { NgIconsModule } from '@ng-icons/core';
import { HeroChip, HeroDocument, HeroDocumentText, HeroLightningBolt, HeroPhotograph, HeroX, HeroBookOpen } from '@ng-icons/heroicons';
import { SearchComponent } from './search/search.component';
import {PyodideService} from 'src/app/pyodide/pyodide.service';

/**
 * Here we can adjust how the ngx-markdown renderer transforms markdown to html (if needed for styling for example)
 * https://jfcere.github.io/ngx-markdown/get-started#renderer
 */
export function markedOptionsFactory(): MarkedOptions {
  let renderer = new MarkedRenderer();
  /* Customization here */
  return { renderer };
}

@NgModule({
  declarations: [AppComponent, NavbarComponent, ActionbarComponent, SearchComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularSplitModule,
    MonacoEditorModule.forRoot(),
    ViewerModule,
    FormsModule,
    FilesystemModule,
    UnityModule,
    HttpClientModule,
    GuidedTourModule,
    NgIconsModule.withIcons({ HeroDocumentText, HeroDocument, HeroX, HeroPhotograph, HeroChip, HeroLightningBolt, HeroBookOpen }),
    MarkdownModule.forRoot({
      loader: HttpClient, // Optional, only needed if we use [src] attribute
      markedOptions: {
        provide: MarkedOptions,
        useFactory: markedOptionsFactory,
      },
    }),
  ],
  providers: [
    GuidedTourService,
    { provide: Window, useValue: window },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector, private pyodideService: PyodideService) {
    setupPythonCalls(injector, pyodideService);
  }
}
