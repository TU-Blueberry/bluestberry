import { TestBed } from '@angular/core/testing';

import { FilesystemEventService } from './filesystem-event.service';

describe('EventService', () => {
  let service: FilesystemEventService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilesystemEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
