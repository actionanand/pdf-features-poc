import { Injectable } from '@angular/core';
import { LOCK_SCREEN_CONFIG, LockScreenConfig } from '../config/lock-screen.config';

@Injectable({
  providedIn: 'root'
})
export class LockScreenService {
  private config: LockScreenConfig = LOCK_SCREEN_CONFIG;

  constructor() { }

  /**
   * Generate SHA1 hash of a string
   */
  private async sha1(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Validate password against stored hash
   */
  async validatePassword(password: string): Promise<boolean> {
    const hash = await this.sha1(password);
    return hash === this.config.passwordHash;
  }

  /**
   * Store authentication token in local storage
   */
  storeAuthToken(password: string): void {
    const authData = {
      hash: this.config.passwordHash,
      timestamp: Date.now()
    };
    localStorage.setItem(this.config.storageKey, JSON.stringify(authData));
  }

  /**
   * Check if user is authenticated and token is not expired
   */
  isAuthenticated(): boolean {
    const storedData = localStorage.getItem(this.config.storageKey);
    
    if (!storedData) {
      return false;
    }

    try {
      const authData = JSON.parse(storedData);
      
      // Check if hash matches current config
      if (authData.hash !== this.config.passwordHash) {
        this.clearAuthToken();
        return false;
      }

      // Check expiry (0 means no expiry)
      if (this.config.expiryTime > 0) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - authData.timestamp;
        
        if (elapsedTime > this.config.expiryTime) {
          this.clearAuthToken();
          return false;
        }
      }

      return true;
    } catch (error) {
      this.clearAuthToken();
      return false;
    }
  }

  /**
   * Clear authentication token from local storage
   */
  clearAuthToken(): void {
    localStorage.removeItem(this.config.storageKey);
  }

  /**
   * Get UI configuration
   */
  getConfig(): LockScreenConfig {
    return this.config;
  }

  /**
   * Get remaining time before expiry (in milliseconds)
   * Returns -1 if no expiry is set
   */
  getRemainingTime(): number {
    if (this.config.expiryTime === 0) {
      return -1; // No expiry
    }

    const storedData = localStorage.getItem(this.config.storageKey);
    if (!storedData) {
      return 0;
    }

    try {
      const authData = JSON.parse(storedData);
      const currentTime = Date.now();
      const elapsedTime = currentTime - authData.timestamp;
      const remaining = this.config.expiryTime - elapsedTime;
      
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      return 0;
    }
  }
}
