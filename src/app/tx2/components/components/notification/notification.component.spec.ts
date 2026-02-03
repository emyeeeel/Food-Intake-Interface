import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotifComponent } from './notification.component';

describe('NotifComponent', () => {
  let component: NotifComponent;
  let fixture: ComponentFixture<NotifComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotifComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotifComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
