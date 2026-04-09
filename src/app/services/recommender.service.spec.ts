import { TestBed } from '@angular/core/testing';

import { RecommenderService } from './recommender.service';

describe('RecommenderService', () => {
  let service: RecommenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecommenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
