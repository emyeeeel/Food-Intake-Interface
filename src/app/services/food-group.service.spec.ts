import { TestBed } from '@angular/core/testing';

import { FoodGroupService } from './food-group.service';

describe('FoodGroupService', () => {
  let service: FoodGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FoodGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
