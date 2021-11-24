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
import { UnityComponent } from './unity/unity.component';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {AngularSplitModule} from 'angular-split';
import {MarkdownModule, MarkedOptions, MarkedRenderer} from "ngx-markdown";

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
  declarations: [AppComponent, NavbarComponent, ActionbarComponent],
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
    MarkdownModule.forRoot({
      loader: HttpClient, // Optional, only needed if we use [src] attribute
      markedOptions: {
        provide: MarkedOptions,
        useFactory: markedOptionsFactory,
      },
    }),
  ],
  providers: [{ provide: Window, useValue: window }],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector) {
    setupPythonCalls(injector);
  }
}
