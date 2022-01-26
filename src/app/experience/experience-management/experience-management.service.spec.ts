import { TestBed } from '@angular/core/testing';

import { ExperienceManagementService } from './experience-management.service';

describe('LessonManagementService', () => {
  let service: ExperienceManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperienceManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
