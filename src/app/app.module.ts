import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { setupPythonCalls } from 'src/app/python-callable/python-callable.decorator';
import { ViewerModule } from 'src/app/viewer/viewer.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { FormsModule } from '@angular/forms';
import { UnityModule } from './unity/unity.module';
import { UnityComponent } from './unity/unity.component';

@NgModule({
  declarations: [AppComponent, UnityComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MonacoEditorModule.forRoot(),
    ViewerModule,
    FormsModule,
    UnityModule,
  ],
  providers: [{ provide: Window, useValue: window }],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector) {
    setupPythonCalls(injector);
  }
}
