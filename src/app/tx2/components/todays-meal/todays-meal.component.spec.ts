import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodaysMealComponent } from './todays-meal.component';

describe('TodaysMealComponent', () => {
  let component: TodaysMealComponent;
  let fixture: ComponentFixture<TodaysMealComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodaysMealComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodaysMealComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
