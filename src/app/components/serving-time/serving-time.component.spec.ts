import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServingTimeComponent } from './serving-time.component';

describe('ServingTimeComponent', () => {
  let component: ServingTimeComponent;
  let fixture: ComponentFixture<ServingTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServingTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServingTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
