import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterIntakeComponent } from './water-intake.component';

describe('WaterIntakeComponent', () => {
  let component: WaterIntakeComponent;
  let fixture: ComponentFixture<WaterIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaterIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
