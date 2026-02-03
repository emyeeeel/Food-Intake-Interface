import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIntakeComponent } from './add-intake.component';

describe('AddIntakeComponent', () => {
  let component: AddIntakeComponent;
  let fixture: ComponentFixture<AddIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
