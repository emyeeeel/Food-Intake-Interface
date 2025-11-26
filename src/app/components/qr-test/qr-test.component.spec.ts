import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrTestComponent } from './qr-test.component';

describe('QrTestComponent', () => {
  let component: QrTestComponent;
  let fixture: ComponentFixture<QrTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
