import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToolbarModule, ButtonModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'PEI-web-app';

  constructor(private router: Router) {}

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
