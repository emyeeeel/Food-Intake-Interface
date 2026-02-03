import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntakesComponent } from './intakes.component';

describe('IntakesComponent', () => {
  let component: IntakesComponent;
  let fixture: ComponentFixture<IntakesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntakesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntakesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
