import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMealsComponent } from './patient-meals.component';

describe('PatientMealsComponent', () => {
  let component: PatientMealsComponent;
  let fixture: ComponentFixture<PatientMealsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMealsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMealsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
