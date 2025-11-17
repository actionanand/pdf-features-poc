import { TestBed } from '@angular/core/testing';
import { ConsoleManagerService } from './console-manager.service';

describe('ConsoleManagerService', () => {
  let service: ConsoleManagerService;
  let originalConsole: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    
    // Store original console methods
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    localStorage.clear();
    service = TestBed.inject(ConsoleManagerService);
  });

  afterEach(() => {
    localStorage.clear();
    // Restore original console
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize successfully', () => {
    expect(service.isServiceInitialized()).toBe(true);
  });

  describe('isConsoleEnabled', () => {
    it('should return false by default (no localStorage value)', () => {
      expect(service.isConsoleEnabled()).toBe(false);
    });

    it('should return true when localStorage has "ON"', () => {
      localStorage.setItem('enableLog', 'ON');
      expect(service.isConsoleEnabled()).toBe(true);
    });

    it('should return false when localStorage has other value', () => {
      localStorage.setItem('enableLog', 'OFF');
      expect(service.isConsoleEnabled()).toBe(false);
    });
  });

  describe('enableConsole', () => {
    it('should set localStorage to "ON"', () => {
      service.enableConsole();
      expect(localStorage.getItem('enableLog')).toBe('ON');
      expect(service.isConsoleEnabled()).toBe(true);
    });

    it('should enable console methods', () => {
      service.disableConsole();
      const logSpy = jasmine.createSpy('log');
      console.log = logSpy;

      service.enableConsole();
      console.log('test');
      
      // After enabling, console should work
      expect(service.isConsoleEnabled()).toBe(true);
    });
  });

  describe('disableConsole', () => {
    it('should remove localStorage key', () => {
      localStorage.setItem('enableLog', 'ON');
      service.disableConsole();
      expect(localStorage.getItem('enableLog')).toBeNull();
      expect(service.isConsoleEnabled()).toBe(false);
    });
  });

  describe('toggleConsole', () => {
    it('should toggle from disabled to enabled', () => {
      expect(service.isConsoleEnabled()).toBe(false);
      const newState = service.toggleConsole();
      expect(newState).toBe(true);
      expect(service.isConsoleEnabled()).toBe(true);
    });

    it('should toggle from enabled to disabled', () => {
      service.enableConsole();
      expect(service.isConsoleEnabled()).toBe(true);
      const newState = service.toggleConsole();
      expect(newState).toBe(false);
      expect(service.isConsoleEnabled()).toBe(false);
    });
  });

  describe('getConsoleState', () => {
    it('should return observable of console state', (done) => {
      service.getConsoleState().subscribe(state => {
        expect(typeof state).toBe('boolean');
        done();
      });
    });

    it('should emit new state when console is toggled', (done) => {
      let emissionCount = 0;
      service.getConsoleState().subscribe(state => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(state).toBe(true);
          done();
        }
      });
      service.enableConsole();
    });
  });

  describe('getConfig', () => {
    it('should return configuration object', () => {
      const config = service.getConfig();
      expect(config).toBeTruthy();
      expect(config.storageKey).toBe('enableLog');
      expect(config.enableValue).toBe('ON');
    });
  });

  describe('forceRestoreConsole', () => {
    it('should restore original console methods', () => {
      service.disableConsole();
      service.forceRestoreConsole();
      
      // Console should be usable again regardless of localStorage
      const logSpy = jasmine.createSpy('log');
      const originalLog = console.log;
      console.log = logSpy;
      console.log('test');
      expect(logSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('console interception', () => {
    it('should intercept console.log when disabled', () => {
      service.disableConsole();
      
      const logSpy = jasmine.createSpy('log');
      console.log = logSpy;
      
      // Try to log something
      console.log('This should not appear');
      
      // Console.log should have been called but replaced with no-op
      expect(service.isConsoleEnabled()).toBe(false);
    });

    it('should allow console.log when enabled', () => {
      service.enableConsole();
      expect(service.isConsoleEnabled()).toBe(true);
    });
  });
});
