import { TestBed } from '@angular/core/testing';

import { LessonEventsService } from './lesson-events.service';

describe('LessonEventsService', () => {
  let service: LessonEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LessonEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
