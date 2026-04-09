import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAllIngredientsComponent } from './print-all-ingredients.component';

describe('PrintAllIngredientsComponent', () => {
  let component: PrintAllIngredientsComponent;
  let fixture: ComponentFixture<PrintAllIngredientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintAllIngredientsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintAllIngredientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
