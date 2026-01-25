import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProteinIntakeComponent } from './protein-intake.component';

describe('ProteinIntakeComponent', () => {
  let component: ProteinIntakeComponent;
  let fixture: ComponentFixture<ProteinIntakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProteinIntakeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProteinIntakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
