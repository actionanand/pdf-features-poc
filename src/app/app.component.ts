import { Component } from '@angular/core';
import { ConsoleManagerService } from './console-manager/services/console-manager.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  // title = 'pdf-features-poc';

  constructor(private consoleManagerService: ConsoleManagerService) {
    // Initialize console manager as early as possible
    // The service will automatically check localStorage and apply the appropriate state
    console.log('Console Manager initialized. Current state:', 
      this.consoleManagerService.isConsoleEnabled() ? 'ENABLED' : 'DISABLED');
  }
}
