import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CONSOLE_MANAGER_CONFIG, ConsoleManagerConfig, ConsoleMethod } from '../config/console-manager.config';

interface OriginalConsoleMethods {
  [key: string]: (...args: any[]) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConsoleManagerService {
  private config: ConsoleManagerConfig = CONSOLE_MANAGER_CONFIG;
  private originalConsole: OriginalConsoleMethods = {};
  private isInitialized = false;
  private warningShown = false;
  private isEnabledSubject = new BehaviorSubject<boolean>(this.isConsoleEnabled());

  constructor() {
    // Initialize on service creation
    this.init();
  }

  /**
   * Initialize console interception
   * This should be called as early as possible in the application lifecycle
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    // Store original console methods
    this.config.interceptMethods.forEach((method: ConsoleMethod) => {
      if (console[method]) {
        this.originalConsole[method] = console[method].bind(console);
      }
    });

    // Override console methods
    this.applyConsoleState();
    this.isInitialized = true;

    // Listen for storage changes from other tabs/windows
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.config.storageKey) {
          this.applyConsoleState();
        }
      });
    }
  }

  /**
   * Check if console is enabled based on localStorage
   */
  isConsoleEnabled(): boolean {
    if (typeof localStorage === 'undefined') {
      return this.config.defaultEnabled;
    }

    const storedValue = localStorage.getItem(this.config.storageKey);
    
    if (storedValue === null) {
      return this.config.defaultEnabled;
    }

    return storedValue === this.config.enableValue;
  }

  /**
   * Enable console logs
   */
  enableConsole(): void {
    localStorage.setItem(this.config.storageKey, this.config.enableValue);
    this.applyConsoleState();
  }

  /**
   * Disable console logs
   */
  disableConsole(): void {
    localStorage.removeItem(this.config.storageKey);
    this.applyConsoleState();
  }

  /**
   * Toggle console state
   */
  toggleConsole(): boolean {
    if (this.isConsoleEnabled()) {
      this.disableConsole();
    } else {
      this.enableConsole();
    }
    return this.isConsoleEnabled();
  }

  /**
   * Get observable for console enabled state
   */
  getConsoleState(): Observable<boolean> {
    return this.isEnabledSubject.asObservable();
  }

  /**
   * Apply console state based on current settings
   */
  private applyConsoleState(): void {
    const isEnabled = this.isConsoleEnabled();
    this.isEnabledSubject.next(isEnabled);
    this.warningShown = false;

    this.config.interceptMethods.forEach((method: ConsoleMethod) => {
      if (isEnabled) {
        // Restore original console method
        if (this.originalConsole[method]) {
          console[method] = this.originalConsole[method];
        }
      } else {
        // Replace with no-op or warning
        console[method] = (...args: any[]) => {
          // Show warning once if configured
          if (this.config.showDisabledWarning && !this.warningShown) {
            this.warningShown = true;
            // Use original console to show warning
            if (this.originalConsole['warn']) {
              this.originalConsole['warn'](this.config.disabledWarningMessage);
            }
          }
          // Do nothing else (logs are disabled)
        };
      }
    });
  }

  /**
   * Force restore original console (useful for debugging)
   * WARNING: This bypasses the console manager
   */
  forceRestoreConsole(): void {
    this.config.interceptMethods.forEach((method: ConsoleMethod) => {
      if (this.originalConsole[method]) {
        console[method] = this.originalConsole[method];
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): ConsoleManagerConfig {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
