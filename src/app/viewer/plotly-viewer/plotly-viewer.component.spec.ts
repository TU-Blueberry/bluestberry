import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotlyViewerComponent } from './plotly-viewer.component';

describe('PlotlyViewerComponent', () => {
  let component: PlotlyViewerComponent;
  let fixture: ComponentFixture<PlotlyViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlotlyViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotlyViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
