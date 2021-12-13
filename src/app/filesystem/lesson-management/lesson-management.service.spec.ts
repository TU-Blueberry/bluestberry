import { TestBed } from '@angular/core/testing';

import { LessonManagementService } from './lesson-management.service';

describe('LessonManagementService', () => {
  let service: LessonManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LessonManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
