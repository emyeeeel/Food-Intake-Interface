import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngredientsCardComponent } from './ingredients-card.component';

describe('IngredientsCardComponent', () => {
  let component: IngredientsCardComponent;
  let fixture: ComponentFixture<IngredientsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientsCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngredientsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
