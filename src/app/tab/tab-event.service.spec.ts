import { TestBed } from '@angular/core/testing';

import { TabEventService } from './tab-event.service';

describe('TabEventService', () => {
  let service: TabEventService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
