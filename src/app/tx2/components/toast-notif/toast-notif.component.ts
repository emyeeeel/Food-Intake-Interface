import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';

@Component({
  template: `
        <div class="card flex justify-center gap-2">
            <p-toast />
            <p-button type="button" pRipple (click)="showSuccess()" label="Success" severity="success" />
            <p-button type="button" pRipple (click)="showInfo()" label="Info" severity="info" />
            <p-button type="button" pRipple (click)="showWarn()" label="Warn" severity="warn" />
            <p-button type="button" pRipple (click)="showError()" label="Error" severity="danger" />
            <p-button type="button" pRipple (click)="showSecondary()" label="Secondary" severity="secondary" />
            <p-button type="button" pRipple (click)="showContrast()" label="Contrast" severity="contrast" />
        </div>
    `,
    standalone: true,
    imports: [ButtonModule, ToastModule, RippleModule],
    providers: [MessageService]
})
export class ToastNotifComponent {
  private messageService = inject(MessageService);

  showInfo() {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Message Content' });
  }

  showWarn() {
      this.messageService.add({ severity: 'warn', summary: 'Warn', detail: 'Message Content' });
  }

  showError() {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Message Content' });
  }

  showContrast() {
      this.messageService.add({ severity: 'contrast', summary: 'Contrast', detail: 'Message Content' });
  }

  showSecondary() {
      this.messageService.add({ severity: 'secondary', summary: 'Secondary', detail: 'Message Content' });
  }
}
