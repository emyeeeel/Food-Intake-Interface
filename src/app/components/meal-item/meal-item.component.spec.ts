import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealItemComponent } from './meal-item.component';

describe('MealItemComponent', () => {
  let component: MealItemComponent;
  let fixture: ComponentFixture<MealItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
