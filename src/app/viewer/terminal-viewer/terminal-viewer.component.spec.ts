import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalViewerComponent } from './terminal-viewer.component';

describe('TerminalViewerComponent', () => {
  let component: TerminalViewerComponent;
  let fixture: ComponentFixture<TerminalViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TerminalViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TerminalViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
