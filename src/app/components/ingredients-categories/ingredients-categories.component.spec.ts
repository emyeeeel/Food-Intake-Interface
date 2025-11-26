import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngredientsCategoriesComponent } from './ingredients-categories.component';

describe('IngredientsCategoriesComponent', () => {
  let component: IngredientsCategoriesComponent;
  let fixture: ComponentFixture<IngredientsCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientsCategoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngredientsCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
