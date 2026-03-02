import { Component } from '@angular/core';
import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { SetupComponent } from '../../components/setup/setup.component';

@Component({
  selector: 'app-settings',
  imports: [MenuBarComponent, SetupComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  isMobileMenuOpen = false; 

  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }
}
