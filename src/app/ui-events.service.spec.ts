import { TestBed } from '@angular/core/testing';

import { UiEventsService } from './ui-events.service';

describe('UiEventsService', () => {
  let service: UiEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UiEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
