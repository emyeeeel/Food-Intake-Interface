import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsumptionBarComponent } from './consumption-bar.component';

describe('ConsumptionBarComponent', () => {
  let component: ConsumptionBarComponent;
  let fixture: ComponentFixture<ConsumptionBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsumptionBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsumptionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
