import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntakeLegendComponent } from './intake-legend.component';

describe('IntakeLegendComponent', () => {
  let component: IntakeLegendComponent;
  let fixture: ComponentFixture<IntakeLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntakeLegendComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntakeLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
