import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayPatientComponent } from './display-patient.component';

describe('DisplayPatientComponent', () => {
  let component: DisplayPatientComponent;
  let fixture: ComponentFixture<DisplayPatientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayPatientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayPatientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
