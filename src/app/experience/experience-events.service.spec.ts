import { TestBed } from '@angular/core/testing';

import { ExperienceEventsService } from './experience-events.service';

describe('LessonEventsService', () => {
  let service: ExperienceEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperienceEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
