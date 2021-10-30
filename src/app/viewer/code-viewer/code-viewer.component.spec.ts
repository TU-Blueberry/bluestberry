import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeViewerComponent } from './code-viewer.component';
import {MonacoEditorModule} from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';

describe('CodeViewerComponent', () => {
  let component: CodeViewerComponent;
  let fixture: ComponentFixture<CodeViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MonacoEditorModule.forRoot(), FormsModule ],
      declarations: [ CodeViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
