import { Injectable } from '@angular/core';

export type SidebarMode = 'thumbnails' | 'index' | 'attachments' | null;

export interface SidebarState {
  currentMode: SidebarMode;
  isVisible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  
  private sidebarState: SidebarState = {
    currentMode: null,
    isVisible: false
  };

  constructor() {}

  getSidebarState(): SidebarState {
    return { ...this.sidebarState };
  }

  toggleSidebar(mode: SidebarMode): SidebarState {
    if (this.sidebarState.currentMode === mode && this.sidebarState.isVisible) {
      // Hide sidebar if clicking the same mode
      this.sidebarState.isVisible = false;
      this.sidebarState.currentMode = null;
    } else {
      // Show sidebar with new mode
      this.sidebarState.isVisible = true;
      this.sidebarState.currentMode = mode;
    }
    
    return { ...this.sidebarState };
  }

  hideSidebar(): SidebarState {
    this.sidebarState.isVisible = false;
    this.sidebarState.currentMode = null;
    return { ...this.sidebarState };
  }

  showSidebar(mode: SidebarMode): SidebarState {
    this.sidebarState.isVisible = true;
    this.sidebarState.currentMode = mode;
    return { ...this.sidebarState };
  }

  isCurrentMode(mode: SidebarMode): boolean {
    return this.sidebarState.currentMode === mode && this.sidebarState.isVisible;
  }

  isSidebarVisible(): boolean {
    return this.sidebarState.isVisible;
  }

  getCurrentMode(): SidebarMode {
    return this.sidebarState.currentMode;
  }
}
