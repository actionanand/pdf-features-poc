export interface ConsoleManagerConfig {
  /**
   * LocalStorage key to check for console log state
   * If localStorage[storageKey] === enableValue, logs are enabled
   * Otherwise, logs are disabled
   */
  storageKey: string;

  /**
   * Value that enables console logs when found in localStorage
   * Default: 'ON'
   */
  enableValue: string;

  /**
   * Default state when localStorage key doesn't exist
   * true: Enable logs by default
   * false: Disable logs by default (recommended)
   */
  defaultEnabled: boolean;

  /**
   * Console methods to intercept and control
   */
  interceptMethods: ConsoleMethod[];

  /**
   * Show warning message when logs are disabled
   */
  showDisabledWarning: boolean;

  /**
   * Custom warning message (shown once when console is accessed while disabled)
   */
  disabledWarningMessage: string;
}

export type ConsoleMethod = 'log' | 'debug' | 'info' | 'warn' | 'error' | 'trace' | 'table' | 'group' | 'groupEnd' | 'groupCollapsed';

/**
 * Console Manager Configuration
 * 
 * To enable console logs:
 * 1. Open browser console
 * 2. Run: localStorage.setItem('enableLog', 'ON')
 * 3. Refresh the page
 * 
 * To disable console logs:
 * 1. Run: localStorage.removeItem('enableLog')
 * 2. Refresh the page
 * 
 * OR use the Console Manager UI component
 */
export const CONSOLE_MANAGER_CONFIG: ConsoleManagerConfig = {
  storageKey: 'enableLog',
  enableValue: 'ON',
  defaultEnabled: false, // Disable logs by default
  interceptMethods: ['log', 'debug', 'info', 'warn', 'error', 'trace', 'table', 'group', 'groupEnd', 'groupCollapsed'],
  showDisabledWarning: true,
  disabledWarningMessage: '🔇 Console logs are disabled. Set localStorage.enableLog = "ON" to enable.'
};
