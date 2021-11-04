import {Injector, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {setupPythonCalls} from 'src/app/python-callable/python-callable.decorator';
import {ViewerModule} from 'src/app/viewer/viewer.module';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';
import {AngularSplitModule} from 'angular-split';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularSplitModule,
    MonacoEditorModule.forRoot(),
    ViewerModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private injector: Injector) {
    setupPythonCalls(injector);
  }
}

