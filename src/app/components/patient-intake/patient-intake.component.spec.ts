import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientIntakeComponent } from './patient-intake.component';

describe('PatientIntakeComponent', () => {
  let component: PatientIntakeComponent;
  let fixture: ComponentFixture<PatientIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
