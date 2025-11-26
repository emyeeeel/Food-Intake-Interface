import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayCycleComponent } from './day-cycle.component';

describe('DayCycleComponent', () => {
  let component: DayCycleComponent;
  let fixture: ComponentFixture<DayCycleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayCycleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DayCycleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
