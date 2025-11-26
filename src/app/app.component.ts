import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'food-intake';
  // Test if connection is made 
  // ngOnInit(): void {
  //   fetch("http://127.0.0.1:8000/api/patients/1/recommended-intake/")
  //     .then((r: Response) => r.json())
  //     .then((data: any) => console.log(data));
  // }

}
