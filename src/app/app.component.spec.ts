import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import {ViewerModule} from 'src/app/viewer/viewer.module';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import { NavbarComponent } from './navbar/navbar.component';
import { FiletreeComponent } from './filesystem/filetree/filetree.component';
import { ActionbarComponent } from './actionbar/actionbar.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ViewerModule,
        MonacoEditorModule.forRoot(),
      ],
      declarations: [
        AppComponent,
        NavbarComponent,
        FiletreeComponent,
        ActionbarComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'bluestberry'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('BluestBerry');
  });
});
