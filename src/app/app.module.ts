import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { setupPythonCalls } from '../app/python-callable/python-callable.decorator';
import { ViewerModule } from '../app/viewer/viewer.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { FormsModule } from '@angular/forms';
import { FilesystemModule } from './filesystem/filesystem.module';
import { NavbarComponent } from './navbar/navbar.component';
import { ActionbarComponent } from './actionbar/actionbar.component';
import { UnityModule } from './unity/unity.module';
import { UnityComponent } from './unity/unity.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [AppComponent, NavbarComponent, ActionbarComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MonacoEditorModule.forRoot(),
    ViewerModule,
    FormsModule,
    FilesystemModule,
    UnityModule,
    HttpClientModule
  ],
  providers: [{ provide: Window, useValue: window }],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector) {
    setupPythonCalls(injector);
  }
}
