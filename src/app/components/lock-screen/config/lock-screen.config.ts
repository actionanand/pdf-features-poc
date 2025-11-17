import { environment as env } from '../../../../environments/environment';

export interface LockScreenConfig {
  /**
   * SHA1 hash of the password
   * Example: SHA1('mypassword') = '91dfd9ddb4198affc5c194cd8ce6d338fde470e2'
   * You can generate SHA1 hash using: https://emn178.github.io/online-tools/sha1.html
   */
  passwordHash: string;

  /**
   * Expiry time in milliseconds (0 means no expiry)
   * Examples:
   * - 0: No expiry
   * - 3600000: 1 hour (60 * 60 * 1000)
   * - 86400000: 24 hours (24 * 60 * 60 * 1000)
   * - 604800000: 7 days (7 * 24 * 60 * 60 * 1000)
   */
  expiryTime: number;

  /**
   * Local storage key to store the authentication token
   */
  storageKey: string;

  /**
   * UI configuration
   */
  ui: {
    title: string;
    message: string;
    successMessage: string;
    errorMessage: string;
    unlockButtonText: string;
    passwordPlaceholder: string;
  };
}

/**
 * Lock screen configuration
 * 
 * To change the password:
 * 1. Generate SHA1 hash of your desired password
 * 2. Update the passwordHash below
 * 
 * Default password: 'admin123'
 * Default SHA1: 'f865b53623b121fd34ee5426c792e5c33af8c227'
 */
export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: env.passwordHash || 'f865b53623b121fd34ee5426c792e5c33af8c227', // 'admin123'
  expiryTime: 0, // No expiry (set to milliseconds for expiry)
  storageKey: 'pdf_viewer_auth_token',
  ui: {
    title: 'PDF Viewer - Authentication Required',
    message: 'Please enter the password to access the application',
    successMessage: 'Authentication successful! Redirecting...',
    errorMessage: 'Invalid password. Please try again.',
    unlockButtonText: 'Unlock',
    passwordPlaceholder: 'Enter password'
  }
};
