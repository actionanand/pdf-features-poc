import { TestBed } from '@angular/core/testing';
import { SidebarService, SidebarMode, SidebarState } from './sidebar.service';

describe('SidebarService', () => {
  let service: SidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SidebarService]
    });
    service = TestBed.inject(SidebarService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', () => {
      const state = service.getSidebarState();
      expect(state.currentMode).toBeNull();
      expect(state.isVisible).toBe(false);
    });
  });

  describe('getSidebarState', () => {
    it('should return a copy of the sidebar state', () => {
      const state1 = service.getSidebarState();
      const state2 = service.getSidebarState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be different objects
    });

    it('should return current state after modifications', () => {
      service.showSidebar('thumbnails');
      const state = service.getSidebarState();

      expect(state.currentMode).toBe('thumbnails');
      expect(state.isVisible).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('should show sidebar when hidden', () => {
      const state = service.toggleSidebar('thumbnails');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('thumbnails');
    });

    it('should hide sidebar when toggling same mode', () => {
      // First show the sidebar
      service.toggleSidebar('thumbnails');
      
      // Then toggle same mode to hide
      const state = service.toggleSidebar('thumbnails');

      expect(state.isVisible).toBe(false);
      expect(state.currentMode).toBeNull();
    });

    it('should switch to new mode when different mode is selected', () => {
      // Show thumbnails
      service.toggleSidebar('thumbnails');
      
      // Switch to index
      const state = service.toggleSidebar('index');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('index');
    });

    it('should handle all sidebar modes', () => {
      const modes: SidebarMode[] = ['thumbnails', 'index', 'attachments'];

      modes.forEach(mode => {
        const state = service.toggleSidebar(mode);
        expect(state.isVisible).toBe(true);
        expect(state.currentMode).toBe(mode);

        // Toggle again to hide
        const hiddenState = service.toggleSidebar(mode);
        expect(hiddenState.isVisible).toBe(false);
        expect(hiddenState.currentMode).toBeNull();
      });
    });

    it('should handle null mode', () => {
      // First show some mode
      service.showSidebar('thumbnails');
      
      // Toggle with null should hide
      const state = service.toggleSidebar(null);
      
      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBeNull();
    });

    it('should return a copy of the state', () => {
      const state1 = service.toggleSidebar('thumbnails');
      const state2 = service.getSidebarState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('hideSidebar', () => {
    it('should hide visible sidebar', () => {
      // First show sidebar
      service.showSidebar('thumbnails');
      
      const state = service.hideSidebar();

      expect(state.isVisible).toBe(false);
      expect(state.currentMode).toBeNull();
    });

    it('should work when sidebar is already hidden', () => {
      const state = service.hideSidebar();

      expect(state.isVisible).toBe(false);
      expect(state.currentMode).toBeNull();
    });

    it('should reset current mode when hiding', () => {
      service.showSidebar('index');
      
      const state = service.hideSidebar();

      expect(state.currentMode).toBeNull();
    });

    it('should return a copy of the state', () => {
      const state1 = service.hideSidebar();
      const state2 = service.getSidebarState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('showSidebar', () => {
    it('should show sidebar with thumbnails mode', () => {
      const state = service.showSidebar('thumbnails');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('thumbnails');
    });

    it('should show sidebar with index mode', () => {
      const state = service.showSidebar('index');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('index');
    });

    it('should show sidebar with attachments mode', () => {
      const state = service.showSidebar('attachments');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('attachments');
    });

    it('should handle null mode', () => {
      const state = service.showSidebar(null);

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBeNull();
    });

    it('should override previous mode', () => {
      service.showSidebar('thumbnails');
      const state = service.showSidebar('index');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('index');
    });

    it('should work when sidebar is already visible', () => {
      service.showSidebar('thumbnails');
      const state = service.showSidebar('attachments');

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe('attachments');
    });

    it('should return a copy of the state', () => {
      const state1 = service.showSidebar('thumbnails');
      const state2 = service.getSidebarState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('isCurrentMode', () => {
    it('should return true for current visible mode', () => {
      service.showSidebar('thumbnails');

      expect(service.isCurrentMode('thumbnails')).toBe(true);
      expect(service.isCurrentMode('index')).toBe(false);
      expect(service.isCurrentMode('attachments')).toBe(false);
    });

    it('should return false when sidebar is hidden', () => {
      service.showSidebar('thumbnails');
      service.hideSidebar();

      expect(service.isCurrentMode('thumbnails')).toBe(false);
    });

    it('should return false for null mode when sidebar has a mode', () => {
      service.showSidebar('thumbnails');

      expect(service.isCurrentMode(null)).toBe(false);
    });

    it('should return true for null mode when sidebar mode is null and visible', () => {
      service.showSidebar(null);

      expect(service.isCurrentMode(null)).toBe(true);
    });

    it('should return false when sidebar is not visible even if mode matches', () => {
      // Set internal state without showing
      (service as any).sidebarState = {
        currentMode: 'thumbnails',
        isVisible: false
      };

      expect(service.isCurrentMode('thumbnails')).toBe(false);
    });

    it('should handle all modes correctly', () => {
      const modes: SidebarMode[] = ['thumbnails', 'index', 'attachments', null];

      modes.forEach(mode => {
        service.showSidebar(mode);
        expect(service.isCurrentMode(mode)).toBe(true);
        
        // Other modes should return false
        modes.filter(m => m !== mode).forEach(otherMode => {
          expect(service.isCurrentMode(otherMode)).toBe(false);
        });
      });
    });
  });

  describe('isSidebarVisible', () => {
    it('should return false initially', () => {
      expect(service.isSidebarVisible()).toBe(false);
    });

    it('should return true when sidebar is shown', () => {
      service.showSidebar('thumbnails');

      expect(service.isSidebarVisible()).toBe(true);
    });

    it('should return false when sidebar is hidden', () => {
      service.showSidebar('thumbnails');
      service.hideSidebar();

      expect(service.isSidebarVisible()).toBe(false);
    });

    it('should reflect toggleSidebar state changes', () => {
      // Show
      service.toggleSidebar('thumbnails');
      expect(service.isSidebarVisible()).toBe(true);

      // Hide
      service.toggleSidebar('thumbnails');
      expect(service.isSidebarVisible()).toBe(false);
    });
  });

  describe('getCurrentMode', () => {
    it('should return null initially', () => {
      expect(service.getCurrentMode()).toBeNull();
    });

    it('should return current mode when sidebar is shown', () => {
      service.showSidebar('thumbnails');

      expect(service.getCurrentMode()).toBe('thumbnails');
    });

    it('should return null when sidebar is hidden', () => {
      service.showSidebar('thumbnails');
      service.hideSidebar();

      expect(service.getCurrentMode()).toBeNull();
    });

    it('should reflect mode changes', () => {
      service.showSidebar('thumbnails');
      expect(service.getCurrentMode()).toBe('thumbnails');

      service.showSidebar('index');
      expect(service.getCurrentMode()).toBe('index');

      service.showSidebar('attachments');
      expect(service.getCurrentMode()).toBe('attachments');
    });

    it('should handle null mode', () => {
      service.showSidebar(null);

      expect(service.getCurrentMode()).toBeNull();
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state across all methods', () => {
      // Initial state
      expect(service.getSidebarState()).toEqual({
        currentMode: null,
        isVisible: false
      });
      expect(service.isSidebarVisible()).toBe(false);
      expect(service.getCurrentMode()).toBeNull();
      expect(service.isCurrentMode('thumbnails')).toBe(false);

      // Show thumbnails
      service.showSidebar('thumbnails');
      expect(service.getSidebarState()).toEqual({
        currentMode: 'thumbnails',
        isVisible: true
      });
      expect(service.isSidebarVisible()).toBe(true);
      expect(service.getCurrentMode()).toBe('thumbnails');
      expect(service.isCurrentMode('thumbnails')).toBe(true);

      // Toggle to index
      service.toggleSidebar('index');
      expect(service.getSidebarState()).toEqual({
        currentMode: 'index',
        isVisible: true
      });
      expect(service.isSidebarVisible()).toBe(true);
      expect(service.getCurrentMode()).toBe('index');
      expect(service.isCurrentMode('index')).toBe(true);
      expect(service.isCurrentMode('thumbnails')).toBe(false);

      // Hide sidebar
      service.hideSidebar();
      expect(service.getSidebarState()).toEqual({
        currentMode: null,
        isVisible: false
      });
      expect(service.isSidebarVisible()).toBe(false);
      expect(service.getCurrentMode()).toBeNull();
      expect(service.isCurrentMode('index')).toBe(false);
    });

    it('should handle rapid state changes', () => {
      service.showSidebar('thumbnails');
      service.toggleSidebar('index');
      service.hideSidebar();
      service.showSidebar('attachments');
      service.toggleSidebar('attachments');

      expect(service.getSidebarState()).toEqual({
        currentMode: null,
        isVisible: false
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined mode gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const state = service.showSidebar(undefined as any);

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBeUndefined();
    });

    it('should handle invalid mode types gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const invalidMode = 'invalid-mode' as SidebarMode;
      const state = service.showSidebar(invalidMode);

      expect(state.isVisible).toBe(true);
      expect(state.currentMode).toBe(invalidMode);
    });
  });

  describe('State Immutability', () => {
    it('should not allow external modification of returned state', () => {
      const state = service.getSidebarState();
      state.isVisible = true;
      state.currentMode = 'thumbnails';

      const actualState = service.getSidebarState();
      expect(actualState.isVisible).toBe(false);
      expect(actualState.currentMode).toBeNull();
    });

    it('should return new objects on each call', () => {
      const state1 = service.getSidebarState();
      const state2 = service.getSidebarState();
      const state3 = service.toggleSidebar('thumbnails');
      const state4 = service.hideSidebar();

      expect(state1).not.toBe(state2);
      expect(state2).not.toBe(state3);
      expect(state3).not.toBe(state4);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple mode switches correctly', () => {
      const modes: SidebarMode[] = ['thumbnails', 'index', 'attachments'];
      
      // Test switching between all modes
      modes.forEach((mode, index) => {
        service.showSidebar(mode);
        expect(service.getCurrentMode()).toBe(mode);
        expect(service.isCurrentMode(mode)).toBe(true);
        
        // Verify other modes are not current
        modes.filter(m => m !== mode).forEach(otherMode => {
          expect(service.isCurrentMode(otherMode)).toBe(false);
        });
      });
    });

    it('should handle toggle sequence correctly', () => {
      // Start hidden
      expect(service.isSidebarVisible()).toBe(false);

      // Toggle thumbnails (show)
      service.toggleSidebar('thumbnails');
      expect(service.isSidebarVisible()).toBe(true);
      expect(service.getCurrentMode()).toBe('thumbnails');

      // Toggle index (switch mode)
      service.toggleSidebar('index');
      expect(service.isSidebarVisible()).toBe(true);
      expect(service.getCurrentMode()).toBe('index');

      // Toggle index again (hide)
      service.toggleSidebar('index');
      expect(service.isSidebarVisible()).toBe(false);
      expect(service.getCurrentMode()).toBeNull();

      // Toggle thumbnails (show with different mode)
      service.toggleSidebar('thumbnails');
      expect(service.isSidebarVisible()).toBe(true);
      expect(service.getCurrentMode()).toBe('thumbnails');
    });

    it('should maintain state consistency during mixed operations', () => {
      // Use all methods in combination
      service.showSidebar('thumbnails');
      expect(service.isCurrentMode('thumbnails')).toBe(true);

      service.toggleSidebar('index');
      expect(service.isCurrentMode('index')).toBe(true);
      expect(service.isCurrentMode('thumbnails')).toBe(false);

      service.hideSidebar();
      expect(service.isSidebarVisible()).toBe(false);
      expect(service.isCurrentMode('index')).toBe(false);

      service.toggleSidebar('attachments');
      expect(service.isCurrentMode('attachments')).toBe(true);
      expect(service.isSidebarVisible()).toBe(true);
    });
  });
});
