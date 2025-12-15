import { TestBed } from '@angular/core/testing';

import { NutrientService } from './nutrient.service';

describe('NutrientsService', () => {
  let service: NutrientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NutrientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
