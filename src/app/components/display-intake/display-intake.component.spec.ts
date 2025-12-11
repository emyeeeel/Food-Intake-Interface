import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayIntakeComponent } from './display-intake.component';

describe('DisplayIntakeComponent', () => {
  let component: DisplayIntakeComponent;
  let fixture: ComponentFixture<DisplayIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
