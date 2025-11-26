import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealIntakeComponent } from './meal-intake.component';

describe('MealIntakeComponent', () => {
  let component: MealIntakeComponent;
  let fixture: ComponentFixture<MealIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
