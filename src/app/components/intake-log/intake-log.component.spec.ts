import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntakeLogComponent } from './intake-log.component';

describe('IntakeLogComponent', () => {
  let component: IntakeLogComponent;
  let fixture: ComponentFixture<IntakeLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntakeLogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntakeLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
