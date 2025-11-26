import { TestBed } from '@angular/core/testing';

import { CloudTestService } from './cloud-test.service';

describe('CloudTestService', () => {
  let service: CloudTestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CloudTestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
