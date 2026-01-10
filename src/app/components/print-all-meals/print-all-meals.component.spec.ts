import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAllMealsComponent } from './print-all-meals.component';

describe('PrintAllMealsComponent', () => {
  let component: PrintAllMealsComponent;
  let fixture: ComponentFixture<PrintAllMealsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintAllMealsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintAllMealsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
