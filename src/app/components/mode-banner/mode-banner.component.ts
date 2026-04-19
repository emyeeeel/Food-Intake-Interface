import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-mode-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mode-banner.component.html',
  styleUrl: './mode-banner.component.scss',
})
export class ModeBannerComponent {
  @Output() downloadTemplate = new EventEmitter<void>();

  constructor(private settingsService: SettingsService) {}

  get menuMode(): 'cyclic' | 'open' {
    return this.settingsService.menuMode;
  }

  get menuModeLabel(): string {
    return this.menuMode === 'open' ? '開放模式' : '循環模式';
  }

  onDownloadClick(): void {
    this.downloadTemplate.emit();
  }
}
