import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeeHistoryButtonComponent } from './see-history-button.component';

describe('SeeHistoryButtonComponent', () => {
  let component: SeeHistoryButtonComponent;
  let fixture: ComponentFixture<SeeHistoryButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeeHistoryButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeeHistoryButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
