import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConsoleManagerService } from '../services/console-manager.service';

@Component({
  selector: 'app-console-manager',
  templateUrl: './console-manager.component.html',
  styleUrls: ['./console-manager.component.scss']
})
export class ConsoleManagerComponent implements OnInit, OnDestroy {
  isConsoleEnabled = false;
  isVisible = false;
  private destroy$ = new Subject<void>();

  constructor(private consoleManagerService: ConsoleManagerService) {}

  ngOnInit(): void {
    // Subscribe to console state changes
    this.consoleManagerService.getConsoleState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isEnabled => {
        this.isConsoleEnabled = isEnabled;
      });

    // Set initial state
    this.isConsoleEnabled = this.consoleManagerService.isConsoleEnabled();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleConsole(): void {
    this.isConsoleEnabled = this.consoleManagerService.toggleConsole();
  }

  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
  }

  enableConsole(): void {
    this.consoleManagerService.enableConsole();
  }

  disableConsole(): void {
    this.consoleManagerService.disableConsole();
  }
}
