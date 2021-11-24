import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlossaryEntryViewerComponent } from './glossary-entry-viewer.component';

describe('GlossaryEntryViewerComponent', () => {
  let component: GlossaryEntryViewerComponent;
  let fixture: ComponentFixture<GlossaryEntryViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GlossaryEntryViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GlossaryEntryViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
