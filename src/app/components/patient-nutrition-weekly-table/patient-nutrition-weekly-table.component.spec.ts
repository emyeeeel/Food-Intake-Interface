import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PatientNutritionWeeklyTableComponent } from './patient-nutrition-weekly-table.component';

describe('PatientNutritionWeeklyTableComponent', () => {
  let component: PatientNutritionWeeklyTableComponent;
  let fixture: ComponentFixture<PatientNutritionWeeklyTableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PatientNutritionWeeklyTableComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientNutritionWeeklyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
