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
import { SharedModule } from './shared/shared.module';
import { HeroChip, HeroDocument, HeroDocumentText, HeroLightningBolt, HeroPhotograph, HeroX, HeroBookOpen } from '@ng-icons/heroicons';
import { ExperienceModule } from './experience/experience.module';
import { SearchComponent } from './search/search.component';
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { environment } from 'src/environments/environment';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { TabState } from './tab/tab.state';
import { ViewSizeState } from './viewer/sizes.state';
import { ActionbarState } from './actionbar/actionbar.state';
import { ExperienceState } from './experience/experience.state';
import { AppState } from './app.state';

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
    AngularSplitModule.forRoot(),
    MonacoEditorModule.forRoot(),
    ViewerModule,
    FormsModule,
    FilesystemModule,
    UnityModule,
    SharedModule, 
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
    ExperienceModule,
    NgxsModule.forRoot([ViewSizeState, TabState, ActionbarState, ExperienceState, AppState], {
      developmentMode: !environment.production
    }),
    NgxsReduxDevtoolsPluginModule.forRoot({
      disabled: environment.production
    }),
    NgxsLoggerPluginModule.forRoot({
      disabled: environment.production
    }),
    NgxsStoragePluginModule.forRoot({
      key: "experiences"
    })
  ],
  providers: [
    GuidedTourService,
    { provide: Window, useValue: window },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector) {
    setupPythonCalls(injector);
  }
}
