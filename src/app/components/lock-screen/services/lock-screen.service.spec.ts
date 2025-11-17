import { TestBed } from '@angular/core/testing';
import { LockScreenService } from './lock-screen.service';

describe('LockScreenService', () => {
  let service: LockScreenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LockScreenService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const isValid = await service.validatePassword('admin123');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await service.validatePassword('wrongpassword');
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const isValid = await service.validatePassword('Admin123');
      expect(isValid).toBe(false);
    });
  });

  describe('authentication', () => {
    it('should not be authenticated initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should store auth token', () => {
      service.storeAuthToken('admin123');
      expect(localStorage.getItem('pdf_viewer_auth_token')).toBeTruthy();
    });

    it('should be authenticated after storing token', () => {
      service.storeAuthToken('admin123');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should clear auth token', () => {
      service.storeAuthToken('admin123');
      service.clearAuthToken();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('password change detection', () => {
    it('should invalidate token when password hash changes', () => {
      // Store token with current hash
      service.storeAuthToken('admin123');
      expect(service.isAuthenticated()).toBe(true);

      // Simulate password change by modifying stored data
      const authData = {
        hash: 'different-hash',
        timestamp: Date.now()
      };
      localStorage.setItem('pdf_viewer_auth_token', JSON.stringify(authData));

      // Should no longer be authenticated
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('expiry time', () => {
    it('should return -1 for no expiry', () => {
      service.storeAuthToken('admin123');
      expect(service.getRemainingTime()).toBe(-1);
    });
  });

  describe('getConfig', () => {
    it('should return configuration', () => {
      const config = service.getConfig();
      expect(config).toBeTruthy();
      expect(config.passwordHash).toBeTruthy();
      expect(config.storageKey).toBe('pdf_viewer_auth_token');
    });
  });

  describe('error handling', () => {
    it('should handle corrupted local storage data', () => {
      localStorage.setItem('pdf_viewer_auth_token', 'invalid-json');
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle missing timestamp in stored data', () => {
      const authData = { hash: 'd033e22ae348aeb5660fc2140aec35850c4da997' };
      localStorage.setItem('pdf_viewer_auth_token', JSON.stringify(authData));
      expect(service.isAuthenticated()).toBe(true);
    });
  });
});
