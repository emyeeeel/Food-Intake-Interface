import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealAssignmentComponent } from './meal-assignment.component';

describe('MealAssignmentComponent', () => {
  let component: MealAssignmentComponent;
  let fixture: ComponentFixture<MealAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealAssignmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
