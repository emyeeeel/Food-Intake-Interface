import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateContainerComponent } from './date-container.component';

describe('DateContainerComponent', () => {
  let component: DateContainerComponent;
  let fixture: ComponentFixture<DateContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
