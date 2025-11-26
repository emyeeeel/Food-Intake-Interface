import { TestBed } from '@angular/core/testing';

import { RecommendedIntakeService } from './recommended-intake.service';

describe('RecommendedIntakeService', () => {
  let service: RecommendedIntakeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecommendedIntakeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
