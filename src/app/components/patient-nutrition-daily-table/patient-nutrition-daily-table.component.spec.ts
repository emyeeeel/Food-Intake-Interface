import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PatientNutritionDailyTableComponent } from './patient-nutrition-daily-table.component';

describe('PatientNutritionDailyTableComponent', () => {
  let component: PatientNutritionDailyTableComponent;
  let fixture: ComponentFixture<PatientNutritionDailyTableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PatientNutritionDailyTableComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientNutritionDailyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
