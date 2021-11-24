import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HintViewerComponent } from './hint-viewer.component';

describe('HintViewerComponent', () => {
  let component: HintViewerComponent;
  let fixture: ComponentFixture<HintViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HintViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HintViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
