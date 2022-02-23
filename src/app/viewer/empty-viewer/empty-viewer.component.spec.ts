import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyViewerComponent } from './empty-viewer.component';

describe('EmptyViewerComponent', () => {
  let component: EmptyViewerComponent;
  let fixture: ComponentFixture<EmptyViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmptyViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmptyViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
