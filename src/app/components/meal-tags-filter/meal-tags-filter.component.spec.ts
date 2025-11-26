import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealTagsFilterComponent } from './meal-tags-filter.component';

describe('MealTagsFilterComponent', () => {
  let component: MealTagsFilterComponent;
  let fixture: ComponentFixture<MealTagsFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealTagsFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealTagsFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
