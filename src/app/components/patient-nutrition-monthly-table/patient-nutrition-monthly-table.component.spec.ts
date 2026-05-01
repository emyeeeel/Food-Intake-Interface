import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PatientNutritionMonthlyTableComponent } from './patient-nutrition-monthly-table.component';

describe('PatientNutritionMonthlyTableComponent', () => {
  let component: PatientNutritionMonthlyTableComponent;
  let fixture: ComponentFixture<PatientNutritionMonthlyTableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PatientNutritionMonthlyTableComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientNutritionMonthlyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
