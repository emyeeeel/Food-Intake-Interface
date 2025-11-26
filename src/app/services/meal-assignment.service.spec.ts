import { TestBed } from '@angular/core/testing';

import { MealAssignmentService } from './meal-assignment.service';

describe('MealAssignmentService', () => {
  let service: MealAssignmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MealAssignmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
