import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { PdfViewerComponent } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-dual-pdf-viewer',
  templateUrl: './dual-pdf-viewer.component.html',
  styleUrls: ['./dual-pdf-viewer.component.scss']
})
export class DualPdfViewerComponent implements OnInit, OnDestroy {
  @ViewChild('leftPdfViewer', { static: false }) leftPdfViewer!: PdfViewerComponent;
  @ViewChild('rightPdfViewer', { static: false }) rightPdfViewer!: PdfViewerComponent;
  @ViewChild('leftContainer', { static: false }) leftContainer!: ElementRef;
  @ViewChild('rightContainer', { static: false }) rightContainer!: ElementRef;

  // PDF sources
  leftPdfSrc: string | Uint8Array | null = null;
  rightPdfSrc: string | Uint8Array | null = null;

  // PDF metadata
  leftCurrentPage = 1;
  rightCurrentPage = 1;
  leftTotalPages = 0;
  rightTotalPages = 0;
  leftZoom = 1.0;
  rightZoom = 1.0;

  // Linking state
  isLinked = false;
  
  // Loading states
  leftLoading = false;
  rightLoading = false;

  // Error states
  leftError: string | null = null;
  rightError: string | null = null;

  // URL inputs
  leftPdfUrl = '';
  rightPdfUrl = '';

  // Scroll sync variables
  private scrollSyncActive = false;
  private leftScrollListener?: () => void;
  private rightScrollListener?: () => void;

  // Page tracking variables
  private leftPageTracker?: () => void;
  private rightPageTracker?: () => void;

  // Timeout handles for URL loading
  private leftLoadTimeout?: number;
  private rightLoadTimeout?: number;

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.removeScrollListeners();
    this.removePageTrackers();
    // Clear any pending timeouts
    if (this.leftLoadTimeout) {
      window.clearTimeout(this.leftLoadTimeout);
    }
    if (this.rightLoadTimeout) {
      window.clearTimeout(this.rightLoadTimeout);
    }
  }

  // File upload handlers
  onLeftFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.leftError = null;
      this.leftLoading = true;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.leftPdfSrc = new Uint8Array(reader.result as ArrayBuffer);
        this.leftLoading = false;
      };
      reader.onerror = () => {
        this.leftError = 'Failed to read file';
        this.leftLoading = false;
      };
      reader.readAsArrayBuffer(file);
    } else {
      this.leftError = 'Please select a valid PDF file';
    }
  }

  onRightFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.rightError = null;
      this.rightLoading = true;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.rightPdfSrc = new Uint8Array(reader.result as ArrayBuffer);
        this.rightLoading = false;
      };
      reader.onerror = () => {
        this.rightError = 'Failed to read file';
        this.rightLoading = false;
      };
      reader.readAsArrayBuffer(file);
    } else {
      this.rightError = 'Please select a valid PDF file';
    }
  }

  // URL loading handlers
  loadLeftPdfFromUrl(): void {
    if (this.leftPdfUrl.trim()) {
      this.leftError = null;
      this.leftLoading = true;
      this.leftTotalPages = 0; // Reset total pages
      
      // Clear any existing timeout
      if (this.leftLoadTimeout) {
        window.clearTimeout(this.leftLoadTimeout);
      }
      
      // Set a timeout to handle loading failures
      this.leftLoadTimeout = window.setTimeout(() => {
        if (this.leftLoading) {
          this.leftLoading = false;
          this.leftError = 'Loading timeout - Please check the URL and try again';
          this.leftPdfSrc = null;
        }
      }, 30000); // 30 second timeout
      
      this.leftPdfSrc = this.leftPdfUrl.trim();
    }
  }

  loadRightPdfFromUrl(): void {
    if (this.rightPdfUrl.trim()) {
      this.rightError = null;
      this.rightLoading = true;
      this.rightTotalPages = 0; // Reset total pages
      
      // Clear any existing timeout
      if (this.rightLoadTimeout) {
        window.clearTimeout(this.rightLoadTimeout);
      }
      
      // Set a timeout to handle loading failures
      this.rightLoadTimeout = window.setTimeout(() => {
        if (this.rightLoading) {
          this.rightLoading = false;
          this.rightError = 'Loading timeout - Please check the URL and try again';
          this.rightPdfSrc = null;
        }
      }, 30000); // 30 second timeout
      
      this.rightPdfSrc = this.rightPdfUrl.trim();
    }
  }

  // PDF viewer event handlers
  onLeftPdfLoaded(event: any): void {
    // Clear timeout since loading was successful
    if (this.leftLoadTimeout) {
      window.clearTimeout(this.leftLoadTimeout);
      this.leftLoadTimeout = undefined;
    }
    
    this.leftLoading = false;
    this.leftTotalPages = event.numPages;
    this.leftCurrentPage = 1;
    this.leftError = null;
    
    // Setup page tracking for left PDF
    setTimeout(() => this.setupLeftPageTracking(), 500);
  }

  onRightPdfLoaded(event: any): void {
    // Clear timeout since loading was successful
    if (this.rightLoadTimeout) {
      window.clearTimeout(this.rightLoadTimeout);
      this.rightLoadTimeout = undefined;
    }
    
    this.rightLoading = false;
    this.rightTotalPages = event.numPages;
    this.rightCurrentPage = 1;
    this.rightError = null;
    
    // Setup page tracking for right PDF
    setTimeout(() => this.setupRightPageTracking(), 500);
  }

  onLeftPdfError(error: any): void {
    // Clear timeout since we got an error response
    if (this.leftLoadTimeout) {
      window.clearTimeout(this.leftLoadTimeout);
      this.leftLoadTimeout = undefined;
    }
    
    this.leftLoading = false;
    this.leftError = 'Failed to load PDF: ' + (error.message || 'Invalid URL or network error');
    this.leftPdfSrc = null;
  }

  onRightPdfError(error: any): void {
    // Clear timeout since we got an error response
    if (this.rightLoadTimeout) {
      window.clearTimeout(this.rightLoadTimeout);
      this.rightLoadTimeout = undefined;
    }
    
    this.rightLoading = false;
    this.rightError = 'Failed to load PDF: ' + (error.message || 'Invalid URL or network error');
    this.rightPdfSrc = null;
  }

  onLeftPdfProgress(progressData: any): void {
    // Progress handler for left PDF
    if (progressData.loaded && progressData.total) {
      // You can add progress bar logic here if needed
      console.log('Left PDF loading progress:', (progressData.loaded / progressData.total) * 100 + '%');
    }
  }

  onRightPdfProgress(progressData: any): void {
    // Progress handler for right PDF
    if (progressData.loaded && progressData.total) {
      // You can add progress bar logic here if needed
      console.log('Right PDF loading progress:', (progressData.loaded / progressData.total) * 100 + '%');
    }
  }

  onLeftPageChange(event: any): void {
    const page = typeof event === 'number' ? event : event.page || event;
    this.leftCurrentPage = page;
    if (this.isLinked && !this.scrollSyncActive) {
      this.syncPageToRight(page);
    }
  }

  onRightPageChange(event: any): void {
    const page = typeof event === 'number' ? event : event.page || event;
    this.rightCurrentPage = page;
    if (this.isLinked && !this.scrollSyncActive) {
      this.syncPageToLeft(page);
    }
  }

  // Linking functionality
  toggleLink(): void {
    this.isLinked = !this.isLinked;
    
    if (this.isLinked) {
      this.setupScrollSync();
      // Sync current pages
      if (this.leftCurrentPage !== this.rightCurrentPage) {
        this.syncPageToRight(this.leftCurrentPage);
      }
    } else {
      this.removeScrollListeners();
    }
  }

  // Scroll synchronization
  private setupScrollSync(): void {
    this.removeScrollListeners(); // Clean up any existing listeners
    
    // Wait for the next tick to ensure PDF viewers are ready
    setTimeout(() => {
      if (this.leftContainer && this.rightContainer) {
        const leftViewerElement = this.leftContainer.nativeElement.querySelector('pdf-viewer');
        const rightViewerElement = this.rightContainer.nativeElement.querySelector('pdf-viewer');
        
        if (leftViewerElement && rightViewerElement) {
          // Try to get the scrollable container within the PDF viewer
          const leftScrollable = leftViewerElement.querySelector('.ng2-pdf-viewer-container') || leftViewerElement;
          const rightScrollable = rightViewerElement.querySelector('.ng2-pdf-viewer-container') || rightViewerElement;
          
          this.leftScrollListener = () => this.onLeftScroll(leftScrollable, rightScrollable);
          this.rightScrollListener = () => this.onRightScroll(rightScrollable, leftScrollable);
          
          leftScrollable.addEventListener('scroll', this.leftScrollListener);
          rightScrollable.addEventListener('scroll', this.rightScrollListener);
        }
      }
    }, 500); // Increased timeout to ensure PDF is fully loaded
  }

  private onLeftScroll(leftElement: Element, rightElement: Element): void {
    if (!this.isLinked || this.scrollSyncActive) return;
    
    this.scrollSyncActive = true;
    rightElement.scrollTop = leftElement.scrollTop;
    setTimeout(() => this.scrollSyncActive = false, 50);
  }

  private onRightScroll(rightElement: Element, leftElement: Element): void {
    if (!this.isLinked || this.scrollSyncActive) return;
    
    this.scrollSyncActive = true;
    leftElement.scrollTop = rightElement.scrollTop;
    setTimeout(() => this.scrollSyncActive = false, 50);
  }

  private removeScrollListeners(): void {
    if (this.leftScrollListener && this.leftContainer) {
      const leftViewerElement = this.leftContainer.nativeElement.querySelector('pdf-viewer');
      if (leftViewerElement) {
        const leftScrollable = leftViewerElement.querySelector('.ng2-pdf-viewer-container') || leftViewerElement;
        leftScrollable.removeEventListener('scroll', this.leftScrollListener);
      }
    }
    
    if (this.rightScrollListener && this.rightContainer) {
      const rightViewerElement = this.rightContainer.nativeElement.querySelector('pdf-viewer');
      if (rightViewerElement) {
        const rightScrollable = rightViewerElement.querySelector('.ng2-pdf-viewer-container') || rightViewerElement;
        rightScrollable.removeEventListener('scroll', this.rightScrollListener);
      }
    }
    
    this.leftScrollListener = undefined;
    this.rightScrollListener = undefined;
  }

  private syncPageToRight(page: number): void {
    if (this.rightPdfViewer && this.rightTotalPages > 0) {
      const targetPage = Math.min(page, this.rightTotalPages);
      this.rightCurrentPage = targetPage;
      // The page change will be handled by the PDF viewer's page binding
    }
  }

  private syncPageToLeft(page: number): void {
    if (this.leftPdfViewer && this.leftTotalPages > 0) {
      const targetPage = Math.min(page, this.leftTotalPages);
      this.leftCurrentPage = targetPage;
      // The page change will be handled by the PDF viewer's page binding
    }
  }

  // Utility methods
  clearLeftPdf(): void {
    // Clear any pending timeout
    if (this.leftLoadTimeout) {
      window.clearTimeout(this.leftLoadTimeout);
      this.leftLoadTimeout = undefined;
    }
    
    // Remove left page tracker
    if (this.leftPageTracker && this.leftContainer) {
      const leftViewerElement = this.leftContainer.nativeElement.querySelector('pdf-viewer');
      if (leftViewerElement) {
        const leftScrollable = leftViewerElement.querySelector('.ng2-pdf-viewer-container') || leftViewerElement;
        leftScrollable.removeEventListener('scroll', this.leftPageTracker);
      }
      this.leftPageTracker = undefined;
    }
    
    this.leftPdfSrc = null;
    this.leftCurrentPage = 1;
    this.leftTotalPages = 0;
    this.leftError = null;
    this.leftLoading = false;
    this.leftPdfUrl = '';
  }

  clearRightPdf(): void {
    // Clear any pending timeout
    if (this.rightLoadTimeout) {
      window.clearTimeout(this.rightLoadTimeout);
      this.rightLoadTimeout = undefined;
    }
    
    // Remove right page tracker
    if (this.rightPageTracker && this.rightContainer) {
      const rightViewerElement = this.rightContainer.nativeElement.querySelector('pdf-viewer');
      if (rightViewerElement) {
        const rightScrollable = rightViewerElement.querySelector('.ng2-pdf-viewer-container') || rightViewerElement;
        rightScrollable.removeEventListener('scroll', this.rightPageTracker);
      }
      this.rightPageTracker = undefined;
    }
    
    this.rightPdfSrc = null;
    this.rightCurrentPage = 1;
    this.rightTotalPages = 0;
    this.rightError = null;
    this.rightLoading = false;
    this.rightPdfUrl = '';
  }

  // Zoom controls
  zoomIn(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.leftZoom = Math.min(this.leftZoom + 0.1, 3.0);
    } else {
      this.rightZoom = Math.min(this.rightZoom + 0.1, 3.0);
    }
  }

  zoomOut(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.leftZoom = Math.max(this.leftZoom - 0.1, 0.1);
    } else {
      this.rightZoom = Math.max(this.rightZoom - 0.1, 0.1);
    }
  }

  resetZoom(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.leftZoom = 1.0;
    } else {
      this.rightZoom = 1.0;
    }
  }

  // Page tracking methods
  private setupLeftPageTracking(): void {
    if (this.leftContainer) {
      const leftViewerElement = this.leftContainer.nativeElement.querySelector('pdf-viewer');
      if (leftViewerElement) {
        const leftScrollable = leftViewerElement.querySelector('.ng2-pdf-viewer-container') || leftViewerElement;
        
        this.leftPageTracker = () => {
          this.updatePageFromScroll(leftScrollable, 'left');
        };
        
        leftScrollable.addEventListener('scroll', this.leftPageTracker);
      }
    }
  }

  private setupRightPageTracking(): void {
    if (this.rightContainer) {
      const rightViewerElement = this.rightContainer.nativeElement.querySelector('pdf-viewer');
      if (rightViewerElement) {
        const rightScrollable = rightViewerElement.querySelector('.ng2-pdf-viewer-container') || rightViewerElement;
        
        this.rightPageTracker = () => {
          this.updatePageFromScroll(rightScrollable, 'right');
        };
        
        rightScrollable.addEventListener('scroll', this.rightPageTracker);
      }
    }
  }

  private updatePageFromScroll(element: Element, side: 'left' | 'right'): void {
    try {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Calculate current page based on scroll position
      const totalPages = side === 'left' ? this.leftTotalPages : this.rightTotalPages;
      if (totalPages > 0 && scrollHeight > clientHeight) {
        // Calculate which page is currently visible based on scroll position
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        const currentPage = Math.max(1, Math.min(totalPages, Math.floor(scrollPercentage * totalPages) + 1));
        
        if (side === 'left' && this.leftCurrentPage !== currentPage) {
          this.leftCurrentPage = currentPage;
        } else if (side === 'right' && this.rightCurrentPage !== currentPage) {
          this.rightCurrentPage = currentPage;
        }
      }
    } catch (error) {
      // Silently handle any errors in page calculation
      console.warn('Error calculating page from scroll:', error);
    }
  }

  private removePageTrackers(): void {
    if (this.leftPageTracker && this.leftContainer) {
      const leftViewerElement = this.leftContainer.nativeElement.querySelector('pdf-viewer');
      if (leftViewerElement) {
        const leftScrollable = leftViewerElement.querySelector('.ng2-pdf-viewer-container') || leftViewerElement;
        leftScrollable.removeEventListener('scroll', this.leftPageTracker);
      }
      this.leftPageTracker = undefined;
    }
    
    if (this.rightPageTracker && this.rightContainer) {
      const rightViewerElement = this.rightContainer.nativeElement.querySelector('pdf-viewer');
      if (rightViewerElement) {
        const rightScrollable = rightViewerElement.querySelector('.ng2-pdf-viewer-container') || rightViewerElement;
        rightScrollable.removeEventListener('scroll', this.rightPageTracker);
      }
      this.rightPageTracker = undefined;
    }
  }
}
