import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperienceSelectionComponent } from './experience-selection.component';

describe('LessonSelectionComponent', () => {
  let component: ExperienceSelectionComponent;
  let fixture: ComponentFixture<ExperienceSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExperienceSelectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExperienceSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
