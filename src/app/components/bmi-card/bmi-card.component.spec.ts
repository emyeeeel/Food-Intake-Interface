import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmiCardComponent } from './bmi-card.component';

describe('BmiCardComponent', () => {
  let component: BmiCardComponent;
  let fixture: ComponentFixture<BmiCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmiCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BmiCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
