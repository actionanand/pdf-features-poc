import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';

import { PdfViewerComponent } from 'ng2-pdf-viewer';

import { AttachmentService, AttachmentInfo } from '../../services/ng2-pdf-viewer/attachment.service';
import { PdfService } from '../../services/ng2-pdf-viewer/pdf.service';
import { SearchService, SearchState } from '../../services/ng2-pdf-viewer/search.service';
import { SidebarService, SidebarState } from '../../services/ng2-pdf-viewer/sidebar.service';
import { ThumbnailService, ThumbnailData } from '../../services/ng2-pdf-viewer/thumbnail.service';
import { OutlineService, OutlineItem } from '../../services/ng2-pdf-viewer/outline.service';
import { environment as env } from '../../../environments/environment';

@Component({
  selector: 'app-ng2-pdf-viewer',
  templateUrl: './ng2-pdf-viewer.component.html',
  styleUrls: ['./ng2-pdf-viewer.component.scss']
})
export class Ng2PdfViewerComponent implements OnInit, OnDestroy {
  pdfSrc: string | Uint8Array | any | null = null; // Allow password object format
  originalPdfData: ArrayBuffer | null = null; // Store original PDF data for download
  currentPage = 1;
  totalPages = 0;
  zoom = 1.0;
  fitToPage = true;
  isLoading = false;
  error: string | null = null;
  Math = Math;
  
  pdfDocument: any = null;
  showSinglePage = false; // Start in continuous mode (show-all = true)
  showToolbar = true;
  
  // Password protection properties
  isPasswordProtected = false;
  showPasswordDialog = false;
  password = '';
  passwordError = '';
  pendingPdfData: Uint8Array | string | null = null; // Store as Uint8Array to avoid detached ArrayBuffer
  passwordSubmitted = false; // Track if password has been submitted
  
  // Store event handlers to properly remove them
  private searchMatchesHandler: ((event: any) => void) | null = null;
  private pageChangingHandler: ((event: any) => void) | null = null;
  private searchTimeout: number | null = null;
  
  // Service state references
  searchState: SearchState = {
    searchText: '',
    hasSearchResults: false,
    searchResultsInfo: '',
    currentSearchMatchIndex: 0,
    totalSearchMatches: 0
  };
  
  sidebarState: SidebarState = {
    currentMode: null,
    isVisible: false
  };
  
  thumbnails: ThumbnailData[] = [];
  outline: OutlineItem[] = [];
  attachments: AttachmentInfo[] = [];
  
  // Computed properties for template compatibility
  get searchText() { return this.searchState.searchText; }
  set searchText(value: string) { 
    this.searchState.searchText = value;
    this.searchService.updateSearchText(value);
  }
  
  get hasSearchResults() { return this.searchState.hasSearchResults; }
  get searchResultsInfo() { return this.searchState.searchResultsInfo; }
  get currentSearchMatchIndex() { return this.searchState.currentSearchMatchIndex; }
  get totalSearchMatches() { return this.searchState.totalSearchMatches; }
  
  get showThumbnails() { return this.sidebarState.currentMode === 'thumbnails' && this.sidebarState.isVisible; }
  get showIndex() { return this.sidebarState.currentMode === 'index' && this.sidebarState.isVisible; }
  get showAttachments() { return this.sidebarState.currentMode === 'attachments' && this.sidebarState.isVisible; }
  
  get hasOutline() { return this.outline.length > 0; }
  get hasAttachments() { return this.attachments.length > 0; }

  @ViewChild(PdfViewerComponent)
  private pdfComponent!: PdfViewerComponent;

  // readonly pdfUrl = env.pdfUrlLocal;
  readonly pdfUrl = env.pdfUrlDefault;

  constructor(
    private attachmentService: AttachmentService,
    private pdfService: PdfService,
    private searchService: SearchService,
    private sidebarService: SidebarService,
    private thumbnailService: ThumbnailService,
    private outlineService: OutlineService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
  this.loadPdf();

  // Subscribe to service state changes
  this.updateServiceStates();

  // Listen for Ctrl+F to focus custom search box
  window.addEventListener('keydown', this.handleCtrlF);
  }

  ngOnDestroy() {
    // Clean up event listeners
    if (this.pdfComponent && this.pdfComponent.eventBus) {
      if (this.searchMatchesHandler) {
        this.pdfComponent.eventBus.off('updatefindmatchescount', this.searchMatchesHandler);
      }
      if (this.pageChangingHandler) {
        this.pdfComponent.eventBus.off('pagechanging', this.pageChangingHandler);
      }
    }

  // Remove Ctrl+F listener
    window.removeEventListener('keydown', this.handleCtrlF);
    // Clean up timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  /**
   * Handle Ctrl+F to focus custom PDF search box
   */
  private handleCtrlF = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      // Show toolbar if hidden
      if (!this.showToolbar) {
        this.showToolbar = true;
        this.cdr.detectChanges();
      }
      // Focus the search input in the toolbar
      const tryFocusInput = (attempts = 0) => {
        const input = document.querySelector('.pdf-toolbar .search-input') as HTMLInputElement;
        if (input && input.offsetParent !== null) {
          input.focus();
          input.select();
        } else if (attempts < 5) {
          setTimeout(() => tryFocusInput(attempts + 1), 100);
        }
      };
      tryFocusInput();
    }
  };

  
  private updateServiceStates() {
    this.searchState = this.searchService.getSearchState();
    this.sidebarState = this.sidebarService.getSidebarState();
    this.thumbnails = this.thumbnailService.getThumbnails();
    this.outline = this.outlineService.getOutline();
  }

  searchInPdf() {
    if (!this.searchText.trim()) {
      this.clearSearch();
      return;
    }
    
    this.search(this.searchText.trim());
  }

  onSearchInputChange() {
    // Only clear search when input is empty, don't trigger search automatically
    if (!this.searchState.searchText.trim()) {
      this.clearSearch();
    }
  }

  onSearchEnterKey() {
    // If we already have search results, navigate to next occurrence
    if (this.searchState.hasSearchResults && this.searchState.totalSearchMatches > 0) {
      this.findNext();
    } else if (this.searchState.searchText.trim()) {
      // If no search results yet, perform initial search
      this.performSearch();
    }
  }

  performSearch() {
    if (this.searchState.searchText.trim()) {
      // Update the search service with the current search text
      this.searchService.updateSearchText(this.searchState.searchText.trim());
      this.search(this.searchState.searchText.trim());
    }
  }

  clearSearch() {
    this.searchState = this.searchService.clearSearch();
    this.searchService.clearSearchHighlights(this.pdfComponent);
  }

  findNext() {
    if (!this.pdfComponent || !this.searchState.hasSearchResults) return;
    
    // Create a temporary event handler for navigation
    const navigationHandler = (event: any) => {
      console.log('Navigation - Search matches updated:', event);
      if (event.matchesCount) {
        const oldText = this.searchState.searchText;
        this.searchState = this.searchService.updateSearchResults(event.matchesCount);
        this.searchState.searchText = oldText; // Preserve search text
        
        // Scroll to current match
        setTimeout(() => {
          this.scrollToCurrentMatch();
        }, 100);
      }
      // Remove the temporary handler
      this.pdfComponent.eventBus.off('updatefindmatchescount', navigationHandler);
    };
    
    // Add temporary handler
    this.pdfComponent.eventBus.on('updatefindmatchescount', navigationHandler);
    
    // Perform the navigation
    this.searchService.findNext(this.pdfComponent);
  }

  findPrevious() {
    if (!this.pdfComponent || !this.searchState.hasSearchResults) return;
    
    // Create a temporary event handler for navigation
    const navigationHandler = (event: any) => {
      console.log('Navigation - Search matches updated:', event);
      if (event.matchesCount) {
        const oldText = this.searchState.searchText;
        this.searchState = this.searchService.updateSearchResults(event.matchesCount);
        this.searchState.searchText = oldText; // Preserve search text
        
        // Scroll to current match
        setTimeout(() => {
          this.scrollToCurrentMatch();
        }, 100);
      }
      // Remove the temporary handler
      this.pdfComponent.eventBus.off('updatefindmatchescount', navigationHandler);
    };
    
    // Add temporary handler
    this.pdfComponent.eventBus.on('updatefindmatchescount', navigationHandler);
    
    // Perform the navigation
    this.searchService.findPrevious(this.pdfComponent);
  }

  private scrollToCurrentMatch() {
    if (!this.pdfComponent || !this.pdfComponent.pdfViewer) {
      return;
    }

    try {
      // Try to get the current page from the PDF viewer
      const currentPageNumber = this.pdfComponent.pdfViewer.currentPageNumber;
      if (currentPageNumber && currentPageNumber !== this.currentPage) {
        console.log('Updating current page from search result:', currentPageNumber);
        this.currentPage = currentPageNumber;
      }

      // Ensure the page is scrolled to show the highlighted match
      setTimeout(() => {
        if (this.pdfComponent.pdfViewer && this.pdfComponent.pdfViewer.currentPageNumber) {
          const pageElement = document.querySelector(`[data-page-number="${this.pdfComponent.pdfViewer.currentPageNumber}"]`);
          if (pageElement) {
            const highlightedElement = pageElement.querySelector('.highlight.selected');
            if (highlightedElement) {
              highlightedElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
            } else {
              // If no specific highlight found, scroll to the page
              pageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
              });
            }
          }
        }
      }, 150);
    } catch (error) {
      console.warn('Error scrolling to search match:', error);
    }
  }

  search(stringToSearch: string) {
    if (!this.pdfComponent) {
      console.warn('PDF component not ready yet');
      return;
    }

    // Store the search text in the search state
    this.searchService.updateSearchText(stringToSearch);
    
    // Set searching state but keep the search text
    this.searchState = this.searchService.setSearchingState();
    this.searchState.searchText = stringToSearch; // Preserve search text

    // Remove existing event listeners to prevent duplicates
    if (this.searchMatchesHandler) {
      this.pdfComponent.eventBus.off('updatefindmatchescount', this.searchMatchesHandler);
    }
    if (this.pageChangingHandler) {
      this.pdfComponent.eventBus.off('pagechanging', this.pageChangingHandler);
    }

    // Create new event handlers
    this.searchMatchesHandler = (event: any) => {
      console.log('Search matches found:', event);
      
      // Clear timeout since we got a response
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }
      
      // Always update search results, even when no matches found
      this.searchState = this.searchService.updateSearchResults(event.matchesCount);
      // Preserve the search text after updating results
      this.searchState.searchText = stringToSearch;
      
      // Scroll to the first match if found
      if (event.matchesCount && event.matchesCount.total > 0) {
        setTimeout(() => {
          this.scrollToCurrentMatch();
        }, 200);
      }
    };

    this.pageChangingHandler = (event: any) => {
      console.log('Page changing during search:', event);
      if (event.pageNumber && event.pageNumber !== this.currentPage) {
        this.currentPage = event.pageNumber;
      }
    };

    // Add the new event listeners
    this.pdfComponent.eventBus.on('updatefindmatchescount', this.searchMatchesHandler);
    this.pdfComponent.eventBus.on('pagechanging', this.pageChangingHandler);

    // Perform the search
    this.searchService.performSearch(this.pdfComponent, stringToSearch);
    
    // Add a timeout fallback in case the search event doesn't fire
    this.searchTimeout = window.setTimeout(() => {
      if (this.searchState.searchResultsInfo === 'Searching...') {
        console.warn('Search timeout reached, updating state to no matches');
        this.searchState = this.searchService.updateSearchResults(null);
        // Preserve the search text after timeout
        this.searchState.searchText = stringToSearch;
      }
      this.searchTimeout = null;
    }, 5000); // Increased timeout to 5 seconds
  }

  async loadPdf() {
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('Loading PDF as blob from:', this.pdfUrl);
      
      const result = await this.pdfService.loadPdfFromUrl(this.pdfUrl);
      this.pdfSrc = result.pdfSrc;
      this.originalPdfData = result.originalData;
      
      console.log('PDF loaded successfully via PdfService');
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.error = 'Failed to load PDF. Please check your internet connection and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      this.error = 'Please select a valid PDF file.';
      return;
    }
    
    // Validate file size (limit to 50MB)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeInBytes) {
      this.error = 'File size too large. Please select a PDF file smaller than 50MB.';
      return;
    }
    
    this.isLoading = true;
    this.error = null;
    this.isPasswordProtected = false;
    this.showPasswordDialog = false;
    
    try {
      console.log('Loading uploaded PDF file:', file.name);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Create Uint8Array for PDF.js
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Store the original data for download and password handling
      this.originalPdfData = arrayBuffer;
      this.pendingPdfData = uint8Array; // Store as Uint8Array to avoid detached ArrayBuffer issues
      
      // Try to set the PDF source (create a fresh copy to prevent detachment)
      const pdfDataCopy = new Uint8Array(uint8Array);
      this.pdfSrc = pdfDataCopy;
      
      console.log('Uploaded PDF loaded successfully:', file.name);
      
      // Reset states for new PDF
      this.resetPdfStates();
      
    } catch (error) {
      console.error('Error loading uploaded PDF:', error);
      this.error = 'Failed to load the uploaded PDF file. Please try again.';
    } finally {
      this.isLoading = false;
      // Clear the file input for potential re-upload of the same file
      target.value = '';
    }
  }

  private resetPdfStates() {
    // Reset current page
    this.currentPage = 1;
    
    // Clear previous data
    this.thumbnails = [];
    this.outline = [];
    this.attachments = [];
    
    // Reset sidebar state
    this.sidebarState = this.sidebarService.hideSidebar();
    
    // Clear search
    this.searchState = {
      searchText: '',
      hasSearchResults: false,
      searchResultsInfo: '',
      currentSearchMatchIndex: 0,
      totalSearchMatches: 0
    };
    this.searchService.clearSearch();
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  async onPdfLoadComplete(pdf: any) {
    this.totalPages = pdf.numPages;
    this.pdfDocument = pdf;
    console.log('PDF load complete. Total pages:', this.totalPages);
    
    // Clear loading state and errors
    this.isLoading = false;
    this.error = null;
    
    // Reset password protection flag if it was a password-protected PDF
    if (this.isPasswordProtected) {
      console.log('Resetting password protection flag after successful load');
      this.isPasswordProtected = false;
      this.passwordSubmitted = false; // Reset password submitted flag
    }
    
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
    
    // Generate thumbnails after PDF is loaded
    await this.generateThumbnails();
    
    // Generate outline/index if available
    await this.generateOutline();
    
    // Generate attachments if available
    await this.generateAttachments();
    
    // Auto-show thumbnails for multi-page documents
    if (this.totalPages > 1) {
      this.sidebarState = this.sidebarService.showSidebar('thumbnails');
    }
    
    // Start syncing page numbers
    this.startPageSync();
    
    // Update local state
    this.updateServiceStates();
  }

  startPageSync() {
    // Periodically sync the current page number with the PDF viewer
    setInterval(() => {
      if (this.pdfComponent && this.pdfComponent.pdfViewer) {
        const viewerCurrentPage = this.pdfComponent.pdfViewer.currentPageNumber;
        if (viewerCurrentPage && viewerCurrentPage !== this.currentPage) {
          console.log('Syncing page number from', this.currentPage, 'to', viewerCurrentPage);
          this.currentPage = viewerCurrentPage;
        }
      }
    }, 500); // Check every 500ms
  }

  onPageRendered(event: any) {
    console.log('Page rendered:', event.pageNumber);
  }

  onPageChange(event: any) {
    console.log('Page changed to:', event);
    // Update the current page when the PDF viewer navigates to a different page
    // The event might be a number or an object with page info
    if (typeof event === 'number') {
      this.currentPage = event;
    } else if (event && typeof event.page === 'number') {
      this.currentPage = event.page;
    } else if (event && typeof event.pageNumber === 'number') {
      this.currentPage = event.pageNumber;
    }
  }

  onError(error: any) {
    console.error('PDF viewer error:', error);
    
    // Check if this is a password-related error
    if (error && (
      error.name === 'PasswordException' ||
      error.message?.includes('password') ||
      error.message?.includes('PasswordException') ||
      error.message?.includes('Invalid password') ||
      error.message?.includes('No password given') ||
      error.code === 1 // PDF.js password error code
    )) {
      this.isPasswordProtected = true;
      
      // If password was submitted but failed, reopen dialog with error
      if (this.passwordSubmitted) {
        console.log('Password was incorrect, showing error message and reopening dialog');
        this.showPasswordDialog = true;
        this.passwordError = 'Incorrect password. Please try again.';
        this.password = ''; // Clear the incorrect password
        this.isLoading = false;
        this.passwordSubmitted = false; // Reset the flag
      } else {
        console.log('PDF is password protected, showing password dialog');
        this.showPasswordDialog = true;
        this.passwordError = '';
        this.isLoading = false;
      }
      
      this.error = null; // Clear general error since we're handling password
    } else {
      this.error = 'Error displaying PDF: ' + (error.message || error);
      this.isPasswordProtected = false;
      this.showPasswordDialog = false;
      this.isLoading = false;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage() {
    // Ensure the page number is within valid range
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    
    // Navigate the PDF viewer to the specified page
    if (this.pdfComponent && this.pdfComponent.pdfViewer) {
      try {
        console.log('Navigating PDF viewer to page:', this.currentPage);
        this.pdfComponent.pdfViewer.currentPageNumber = this.currentPage;
        
        // Scroll to the page in continuous mode
        if (!this.showSinglePage) {
          setTimeout(() => {
            const pageElement = document.querySelector(`[data-page-number="${this.currentPage}"]`);
            if (pageElement) {
              pageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
              });
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error navigating to page:', error);
      }
    }
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom + 0.25, 3.0);
  }

  zoomOut() {
    this.zoom = Math.max(this.zoom - 0.25, 0.25);
  }

  toggleFitToPage() {
    this.fitToPage = !this.fitToPage;
    if (this.fitToPage) {
      this.zoom = 1.0;
    } else {
      // Set a default zoom when not fitting to page (e.g., previous or custom value)
      this.zoom = 1.25;
    }
  }

  togglePageMode() {
    this.showSinglePage = !this.showSinglePage;
    console.log('Page mode toggled:', this.showSinglePage ? 'Single Page' : 'Continuous Scroll');
  }

  // Sidebar toggle functionality - mutually exclusive
  toggleThumbnails() {
    this.sidebarState = this.sidebarService.toggleSidebar('thumbnails');
  }

  async toggleIndex() {
    this.sidebarState = this.sidebarService.toggleSidebar('index');
    if (this.showIndex && this.outline.length === 0) {
      await this.generateOutline();
      this.updateServiceStates();
    }
  }

  async toggleAttachments() {
    this.sidebarState = this.sidebarService.toggleSidebar('attachments');
    if (this.showAttachments && this.attachments.length === 0) {
      await this.generateAttachments();
    }
  }

  toggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  // Password protection methods
  submitPassword() {
    if (!this.password.trim()) {
      this.passwordError = 'Please enter a password';
      return;
    }

    console.log('Submitting password...');
    this.passwordError = '';
    this.isLoading = true;
    this.passwordSubmitted = true; // Mark that password has been submitted

    // Create PDF source with password - ng2-pdf-viewer format
    if (this.pendingPdfData) {
      try {
        // Create a fresh copy of the data to prevent ArrayBuffer detachment issues
        let pdfDataCopy: Uint8Array;
        
        if (this.pendingPdfData instanceof Uint8Array) {
          // Create a new Uint8Array copy from the existing data
          pdfDataCopy = new Uint8Array(this.pendingPdfData);
        } else {
          // If it's a string, use it directly
          pdfDataCopy = this.pendingPdfData as any;
        }
        
        console.log('Creating PDF source with password. Data type:', typeof pdfDataCopy);
        console.log('Is Uint8Array:', pdfDataCopy instanceof Uint8Array);
        console.log('Data length:', pdfDataCopy.length);
        console.log('Password provided:', !!this.password);
        
        // ng2-pdf-viewer expects this specific format for password-protected PDFs
        const pdfSrcWithPassword = {
          data: pdfDataCopy,
          password: this.password
        };
        
        console.log('Setting PDF source with password, dialog should remain open until success');
        
        // Clear the current src first to force reload
        this.pdfSrc = null;
        
        // Set new source with password after a brief delay
        setTimeout(() => {
          this.pdfSrc = pdfSrcWithPassword;
          console.log('PDF source set with password');
          
          // Close the password dialog immediately after setting the source
          console.log('Closing password dialog after password submission');
          this.closePasswordDialog();
        }, 100);
        
        // Remove the timeout fallback since we're closing immediately
        // Don't wait for onPdfLoadComplete - close dialog after password submission
      } catch (error) {
        console.error('Error applying password:', error);
        this.passwordError = 'Error processing password';
        this.isLoading = false;
      }
    } else {
      this.passwordError = 'No PDF data available';
      this.isLoading = false;
    }
  }

  closePasswordDialog() {
    console.log('Closing password dialog');
    this.showPasswordDialog = false;
    this.password = '';
    this.passwordError = '';
    this.isLoading = false; // Ensure loading is stopped
    this.passwordSubmitted = false; // Reset password submitted flag
    
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  cancelPasswordDialog() {
    this.closePasswordDialog();
    this.pdfSrc = null;
    this.pendingPdfData = null;
    this.isPasswordProtected = false;
    this.isLoading = false;
    this.error = null;
  }

  async generateThumbnails() {
    if (!this.pdfDocument) return;
    
    console.log('Generating thumbnails for', this.totalPages, 'pages');
    
    try {
      this.thumbnails = await this.thumbnailService.generateThumbnails(this.pdfDocument, this.totalPages);
      console.log(`Generated ${this.thumbnails.length} thumbnails successfully`);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      // If thumbnail generation fails, we can still use the PDF viewer without thumbnails
    }
  }

  goToPageFromThumbnail(pageNumber: number) {
    this.currentPage = pageNumber;
  }

  // Enhanced toolbar actions
  async downloadPdf() {
    try {
      console.log('Starting PDF download...');
      
      // First try with fresh fetch if we have a URL
      if (this.pdfUrl) {
        console.log('Fetching fresh PDF from URL:', this.pdfUrl);
        
        const response = await fetch(this.pdfUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf'
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          console.log('Fresh PDF blob size:', blob.size);
          
          if (blob.size > 0) {
            this.triggerDownload(blob);
            console.log('PDF downloaded successfully via fresh fetch');
            return;
          }
        }
        
        console.warn('Fresh fetch failed or returned empty blob, trying stored data...');
      }
      
      // Fallback to stored data
      if (this.pdfSrc instanceof Uint8Array) {
        console.log('Using stored Uint8Array data, size:', this.pdfSrc.length);
        const blob = new Blob([this.pdfSrc as any], { type: 'application/pdf' });
        console.log('Created blob from stored data, size:', blob.size);
        
        this.triggerDownload(blob);
        console.log('PDF downloaded using stored data');
      } else if (typeof this.pdfSrc === 'string') {
        console.log('Trying to download PDF from URL:', this.pdfSrc);
        // For string URLs, fetch and download
        try {
          const response = await fetch(this.pdfSrc);
          const blob = await response.blob();
          this.triggerDownload(blob);
        } catch (fetchError) {
          console.warn('Could not fetch PDF for download, opening in new tab:', fetchError);
          // Last resort - open in new tab
          window.open(this.pdfSrc, '_blank');
        }
      } else {
        console.error('No valid PDF source available for download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }

  private triggerDownload(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getFileName();
    link.style.display = 'none';
    
    // Add to DOM, click, and immediately remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  private getFileName(): string {
    return this.pdfService.getFileName(this.pdfUrl);
  }

  async printPdf() {
    try {
      console.log('Starting PDF print...');
      
      // First try with fresh fetch if we have a URL
      if (this.pdfUrl) {
        console.log('Fetching fresh PDF for printing from URL:', this.pdfUrl);
        
        const response = await fetch(this.pdfUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf'
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          console.log('Fresh PDF blob for printing, size:', blob.size);
          
          if (blob.size > 0) {
            this.triggerPrint(blob);
            console.log('PDF print triggered successfully via fresh fetch');
            return;
          }
        }
        
        console.warn('Fresh fetch failed for printing, trying stored data...');
      }
      
      // Fallback to stored data
      if (this.pdfSrc instanceof Uint8Array) {
        console.log('Using stored Uint8Array data for printing, size:', this.pdfSrc.length);
        const blob = new Blob([this.pdfSrc as any], { type: 'application/pdf' });
        console.log('Created blob from stored data for printing, size:', blob.size);
        
        this.triggerPrint(blob);
        console.log('PDF print triggered using stored data');
      } else if (typeof this.pdfSrc === 'string') {
        console.log('Trying to print PDF from URL:', this.pdfSrc);
        // For string URLs, fetch and print
        try {
          const response = await fetch(this.pdfSrc);
          const blob = await response.blob();
          this.triggerPrint(blob);
        } catch (fetchError) {
          console.warn('Could not fetch PDF for printing, using direct window print:', fetchError);
          // Last resort - try window.print() on current page
          window.print();
        }
      } else {
        console.error('No valid PDF source available for printing');
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
    }
  }

  private triggerPrint(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    
    // Create an iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      try {
        // Wait a bit for the PDF to load in the iframe
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
          
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      } catch (error) {
        console.error('Error triggering print from iframe:', error);
        // Fallback: open in new window
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        // Clean up
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }
    };
    
    iframe.onerror = () => {
      console.warn('Iframe loading failed, trying new window approach');
      // Fallback: open in new window
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      // Clean up
      document.body.removeChild(iframe);
      window.URL.revokeObjectURL(url);
    };
  }

  async generateAttachments() {
    if (!this.pdfDocument) return;
    
    this.attachments = await this.attachmentService.generateAttachments(this.pdfDocument);
  }

  downloadAttachment(attachment: AttachmentInfo) {
    this.attachmentService.downloadAttachment(attachment);
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  async generateOutline() {
    if (!this.pdfDocument) return;
    
    try {
      console.log('Generating outline for PDF document...');
      this.outline = await this.outlineService.processOutline(this.pdfDocument);
      console.log('Generated outline with', this.outline.length, 'items:', this.outline);
      
      // Log some sample page numbers for debugging
      const firstFewItems = this.outline.slice(0, 3);
      firstFewItems.forEach(item => {
        console.log(`Outline item: "${item.title}" -> Page: ${item.pageNumber}`);
      });
    } catch (error) {
      console.error('Error generating outline:', error);
    }
  }

  navigateToOutlineItem(item: OutlineItem) {
    console.log('Navigating to outline item:', item.title, 'Page:', item.pageNumber, 'Coords:', item.destinationCoords);
    
    if (item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= this.totalPages) {
      this.currentPage = item.pageNumber;
      
      // If we have destination coordinates, navigate to exact position
      if (item.destinationCoords) {
        console.log('Using precise navigation with coordinates');
        this.navigateToExactDestination(item.destinationCoords);
      } else {
        // Fallback to simple page navigation with better scrolling
        console.log('Using simple page navigation');
        this.enhancedPageNavigation(item.pageNumber);
      }
      
      // Close sidebar on mobile after navigation
      setTimeout(() => {
        if (window.innerWidth <= 768) {
          this.sidebarState = this.sidebarService.hideSidebar();
        }
      }, 800);
    } else {
      console.warn('Invalid page number for outline item:', item.pageNumber);
    }
  }

  private enhancedPageNavigation(pageNumber: number) {
    // Set the PDF viewer page
    if (this.pdfComponent && this.pdfComponent.pdfViewer) {
      this.pdfComponent.pdfViewer.currentPageNumber = pageNumber;
    }
    
    // Also update our internal page tracking
    this.goToPage();
    
    // Ensure smooth scrolling to the page
    setTimeout(() => {
      this.scrollToPage(pageNumber);
    }, 300);
  }

  private navigateToExactDestination(coords: {pageIndex: number, x?: number, y?: number, zoom?: number}) {
    if (!this.pdfComponent || !this.pdfComponent.pdfViewer) {
      console.warn('PDF viewer not available for precise navigation');
      this.goToPage();
      return;
    }

    try {
      console.log('Navigating to exact destination:', coords);
      
      // First, navigate to the page
      const targetPage = coords.pageIndex + 1; // Convert to 1-based
      this.currentPage = targetPage;
      this.pdfComponent.pdfViewer.currentPageNumber = targetPage;
      
      // Wait for the page to render, then scroll to specific position
      setTimeout(() => {
        try {
          // Method 1: Try using PDF.js scrollPageIntoView with coordinates
          if (this.pdfComponent.pdfViewer.scrollPageIntoView) {
            const scrollOptions = {
              pageNumber: targetPage
            };
            
            // Add coordinates if available
            if (coords.x !== undefined || coords.y !== undefined) {
              (scrollOptions as any).destArray = [
                null, // Page reference (will be resolved)
                { name: 'XYZ' },
                coords.x || null,
                coords.y || null,
                coords.zoom || null
              ];
            }
            
            this.pdfComponent.pdfViewer.scrollPageIntoView(scrollOptions);
            console.log('Used scrollPageIntoView with coordinates');
            return;
          }
          
          // Method 2: Try using linkService if available
          if (this.pdfComponent.pdfViewer.linkService && coords.x !== undefined && coords.y !== undefined) {
            const destination = [
              { num: targetPage, gen: 0 },
              { name: 'XYZ' },
              coords.x,
              coords.y,
              coords.zoom || null
            ];
            
            this.pdfComponent.pdfViewer.linkService.goToDestination(destination);
            console.log('Used linkService navigation');
            return;
          }
          
          // Method 3: Fallback to manual scrolling calculation
          this.manualScrollToCoordinates(targetPage, coords);
          
        } catch (navError) {
          console.warn('Advanced navigation failed, using fallback:', navError);
          this.manualScrollToCoordinates(targetPage, coords);
        }
      }, 500); // Increased delay to ensure page is rendered
      
    } catch (error) {
      console.error('Error navigating to exact destination:', error);
      this.goToPage();
    }
  }

  private manualScrollToCoordinates(pageNumber: number, coords: {pageIndex: number, x?: number, y?: number, zoom?: number}) {
    setTimeout(() => {
      const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`) as HTMLElement;
      if (pageElement) {
        console.log('Found page element for manual scrolling');
        
        let scrollTop = pageElement.offsetTop;
        
        // If we have Y coordinate, try to calculate the approximate position
        if (coords.y !== undefined) {
          // Get the page dimensions
          const pageHeight = pageElement.offsetHeight;
          const canvasElement = pageElement.querySelector('canvas');
          
          if (canvasElement) {
            const canvasHeight = canvasElement.height;
            // Calculate relative position (PDF coordinates are from bottom-left, web is from top-left)
            const relativeY = coords.y / canvasHeight;
            const offsetY = pageHeight * (1 - relativeY); // Invert Y coordinate
            scrollTop += Math.max(0, offsetY);
          }
        }
        
        // Scroll to the calculated position
        const container = document.querySelector('.pdf-viewer-content') || window;
        if (container === window) {
          window.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        } else {
          (container as HTMLElement).scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
        
        console.log('Manual scroll to position:', scrollTop);
      } else {
        console.warn('Page element not found for manual scrolling');
        this.scrollToPage(pageNumber);
      }
    }, 200);
  }

  private scrollToPage(pageNumber: number) {
    setTimeout(() => {
      const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
      if (pageElement) {
        pageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  }

  navigateToPage(pageNumber: number | undefined) {
    if (!pageNumber) {
      console.warn('No page number provided for navigation');
      return;
    }
    
    console.log('Navigating to page:', pageNumber, 'Current page:', this.currentPage);
    
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.goToPage();
      
      // Force the PDF viewer to update if needed
      setTimeout(() => {
        if (this.pdfComponent && this.pdfComponent.pdfViewer) {
          console.log('Forcing page navigation in PDF viewer');
          this.pdfComponent.pdfViewer.currentPageNumber = pageNumber;
        }
      }, 100);
    } else {
      console.warn('Page number out of range:', pageNumber, 'Total pages:', this.totalPages);
    }
  }

  toggleOutlineItem(item: OutlineItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.outlineService.toggleExpanded(item);
  }
}
