import { TestBed } from '@angular/core/testing';

import { AlternativeMealsService } from './alternative-meals.service';

describe('AlternativeMealsService', () => {
  let service: AlternativeMealsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlternativeMealsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
