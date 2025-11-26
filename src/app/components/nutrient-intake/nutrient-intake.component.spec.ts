import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutrientIntakeComponent } from './nutrient-intake.component';

describe('NutrientIntakeComponent', () => {
  let component: NutrientIntakeComponent;
  let fixture: ComponentFixture<NutrientIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutrientIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutrientIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
