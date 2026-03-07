import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewIntakeComponent } from './view-intake.component';

describe('ViewIntakeComponent', () => {
  let component: ViewIntakeComponent;
  let fixture: ComponentFixture<ViewIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
