import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayIngredientsComponent } from './display-ingredients.component';

describe('DisplayIngredientsComponent', () => {
  let component: DisplayIngredientsComponent;
  let fixture: ComponentFixture<DisplayIngredientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayIngredientsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayIngredientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
