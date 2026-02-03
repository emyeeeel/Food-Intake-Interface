import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../components/header/header.component";


@Component({
  selector: 'app-intakes',
  imports: [MatIconModule, CommonModule, HeaderComponent],
  templateUrl: './intakes.component.html',
  styleUrl: './intakes.component.scss',
})
export class IntakesComponent  {
  
}
