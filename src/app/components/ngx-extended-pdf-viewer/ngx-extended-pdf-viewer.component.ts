import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment as env } from '../../../environments/environment';

@Component({
  selector: 'app-ngx-extended-pdf-viewer',
  templateUrl: './ngx-extended-pdf-viewer.component.html',
  styleUrls: ['./ngx-extended-pdf-viewer.component.scss']
})
export class NgxExtendedPdfViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('pdfViewer', { static: false }) pdfViewer!: ElementRef;
  
  pdfSrc: string | Uint8Array | null = env.pdfUrlDefault;
  isLoading = false;
  error: string | null = null;
  pdfDocument: any = null;
  retryCount = 0;
  maxRetries = 5;
  
  // Search functionality
  searchText = 'PDF page images to fit on your paper';
  searchResults: any[] = [];
  currentSearchIndex = 0;
  isSearching = false;
  searchComplete = false;
  lastSearchResultMessage = '';
  automaticSearchTriggered = false;
  
  // NGX Extended PDF Viewer configuration
  showToolbar = true;
  showSidebarButton = true;
  showFindButton = true;
  showPagingButtons = true;
  showZoomButtons = true;
  showPresentationModeButton = true;
  showOpenFileButton = true;
  showPrintButton = true;
  showDownloadButton = true;
  showSecondaryToolbarButton = true;
  showRotateButton = true;
  showHandToolButton = true;
  showScrollingButton = true;
  showSpreadButton = true;
  showPropertiesButton = true;
  
  private readonly pdfUrl = 'https://vadimdez.github.io/ng2-pdf-viewer/assets/pdf-test.pdf';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // PDF is already set directly to the URL, no need to load as blob initially
    // this.loadPdfAsBlob();
  }

  ngAfterViewInit() {
    // Initialize search after view is ready
    console.log('PDF viewer component initialized');
  }

  async loadPdfAsBlob() {
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('Loading PDF as blob from:', this.pdfUrl);
      
      // Load PDF as blob for better performance
      const response = await this.http.get(this.pdfUrl, { 
        responseType: 'blob' 
      }).toPromise();
      
      if (response) {
        // Convert blob to array buffer then to Uint8Array
        const arrayBuffer = await response.arrayBuffer();
        this.pdfSrc = new Uint8Array(arrayBuffer);
        
        console.log('PDF loaded successfully as blob, size:', this.pdfSrc.length, 'bytes');
      } else {
        throw new Error('Failed to load PDF');
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.error = 'Failed to load PDF. Please check your internet connection and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  onPdfLoaded(event: any) {
    console.log('PDF loaded successfully:', event);
    // Store the PDF document reference for searching
    this.pdfDocument = event;
    // Only trigger automatic search if it hasn't been triggered yet
    if (!this.automaticSearchTriggered && !this.searchComplete && !this.isSearching) {
      this.automaticSearchTriggered = true;
      setTimeout(() => this.performAutomaticSearch(), 5000);
    }
  }

  onPdfLoadFailed(event: any) {
    console.error('PDF load failed:', event);
    this.error = 'Failed to display PDF';
  }

  onProgress(event: any) {
    console.log('PDF loading progress:', event);
  }

  onPagesLoaded(event: any) {
    console.log('PDF pages loaded:', event);
    // Additional check when pages are loaded
    console.log('Checking PDFViewerApplication availability:', !!(window as any).PDFViewerApplication);
    if ((window as any).PDFViewerApplication) {
      console.log('PDFViewerApplication.pdfDocument:', !!(window as any).PDFViewerApplication.pdfDocument);
    }
  }

  onTextLayerRendered(event: any) {
    console.log('Text layer rendered:', event);
    // Text layer is ready, perfect time to search - but only if search hasn't been triggered yet
    if (!this.automaticSearchTriggered && !this.searchComplete && !this.isSearching) {
      console.log('Text layer ready, triggering search...');
      this.automaticSearchTriggered = true;
      setTimeout(() => this.performAutomaticSearch(), 3000);
    }
  }

  onAnnotationLayerRendered(event: any) {
    console.log('Annotation layer rendered:', event);
  }

  onPageRendered(event: any) {
    console.log('Page rendered:', event);
  }

  onPageChange(event: any) {
    // Only log page changes if not currently searching to reduce noise
    if (!this.isSearching) {
      console.log('Page changed to:', event);
    }
  }

  retry() {
    this.loadPdfAsBlob();
  }

  toggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  toggleSidebar() {
    this.showSidebarButton = !this.showSidebarButton;
  }

  // Programmatic search functionality
  async performAutomaticSearch() {
    console.log('Starting automatic search for:', this.searchText);
    this.isSearching = true;
    this.searchResults = [];
    this.currentSearchIndex = 0;
    this.searchComplete = false;

    try {
      // Simple approach: Just try the fallback method directly
      console.log('Using simplified search approach');
      await this.simpleSearch();
    } catch (error) {
      console.error('Error during automatic search:', error);
    } finally {
      this.isSearching = false;
      this.searchComplete = true;
    }
  }

  private async simpleSearch() {
    // Wait a bit for the PDF to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try multiple approaches in sequence
    const approaches = [
      () => this.tryFindController(),
      () => this.tryFindBar(),
      () => this.tryDirectDOMSearch()
    ];

    for (const approach of approaches) {
      try {
        const success = await approach();
        if (success) {
          console.log('Search method succeeded');
          return;
        }
      } catch (error) {
        console.warn('Search approach failed, trying next:', error);
      }
    }
    
    console.warn('All search approaches failed');
  }

  private async tryFindController(): Promise<boolean> {
    const app = (window as any).PDFViewerApplication;
    const findController = app?.findController;
    
    if (findController) {
      console.log('Trying FindController approach');
      findController.executeCommand('find', {
        query: this.searchText,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: false
      });
      
      this.listenForSearchResults(findController);
      return true;
    }
    
    return false;
  }

  private async tryFindBar(): Promise<boolean> {
    const app = (window as any).PDFViewerApplication;
    
    if (app && app.findBar) {
      console.log('Trying find bar approach');
      
      app.findBar.open();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const findInput = document.querySelector('#findInput') as HTMLInputElement;
      if (findInput) {
        findInput.value = this.searchText;
        findInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const findNext = document.querySelector('#findNext') as HTMLButtonElement;
        if (findNext) {
          findNext.click();
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.checkSearchResults();
          return true;
        }
      }
    }
    
    return false;
  }

  private async tryDirectDOMSearch(): Promise<boolean> {
    // Last resort: try to trigger search via keyboard simulation
    if (!this.isSearching) {
      console.log('Attempting direct DOM search approach');
    }
    
    // Focus on the PDF viewer
    const pdfViewer = document.querySelector('ngx-extended-pdf-viewer');
    if (pdfViewer) {
      // Simulate Ctrl+F
      const ctrlFEvent = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      
      pdfViewer.dispatchEvent(ctrlFEvent);
      
      // Wait and try to set search text
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const findInput = document.querySelector('#findInput') as HTMLInputElement;
      if (findInput) {
        findInput.value = this.searchText;
        findInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const findNext = document.querySelector('#findNext') as HTMLButtonElement;
        if (findNext) {
          findNext.click();
          
          await new Promise(resolve => setTimeout(resolve, 500));
          this.checkSearchResults();
          return true;
        }
      }
    }
    
    return false;
  }

  private async getPdfDocument(): Promise<any> {
    // Strategy 1: Use stored PDF document from onPdfLoaded event
    if (this.pdfDocument) {
      console.log('Using stored PDF document');
      return this.pdfDocument;
    }

    // Strategy 2: Try accessing through global PDFViewerApplication
    const pdfApplication = (window as any).PDFViewerApplication;
    if (pdfApplication && pdfApplication.pdfDocument) {
      console.log('Using PDF document from PDFViewerApplication');
      return pdfApplication.pdfDocument;
    }

    // Strategy 3: Retry with exponential backoff
    return new Promise((resolve) => {
      const checkForPdf = () => {
        console.log(`Attempt ${this.retryCount + 1}/${this.maxRetries} to find PDF document`);
        
        // Check stored document
        if (this.pdfDocument) {
          console.log('Found stored PDF document on retry');
          resolve(this.pdfDocument);
          return;
        }
        
        // Check global application
        const app = (window as any).PDFViewerApplication;
        if (app && app.pdfDocument) {
          console.log('Found PDF document via PDFViewerApplication on retry');
          resolve(app.pdfDocument);
          return;
        }

        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, this.retryCount), 5000);
          console.log(`Retrying in ${delay}ms...`);
          setTimeout(checkForPdf, delay);
        } else {
          console.error('Max retries reached, PDF document not found');
          resolve(null);
        }
      };
      
      checkForPdf();
    });
  }

  private async searchInPdf(pdfDocument: any) {
    const numPages = pdfDocument.numPages;
    console.log(`Searching in ${numPages} pages for: "${this.searchText}"`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract all text from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        // Search for the text (case-insensitive)
        const searchRegex = new RegExp(this.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = [...pageText.matchAll(searchRegex)];

        if (matches.length > 0) {
          console.log(`Found ${matches.length} matches on page ${pageNum}`);
          
          matches.forEach((match, index) => {
            this.searchResults.push({
              pageNumber: pageNum,
              matchIndex: index,
              text: match[0],
              startIndex: match.index,
              context: this.getContext(pageText, match.index || 0, 100)
            });
          });
        }
      } catch (error) {
        console.error(`Error searching page ${pageNum}:`, error);
      }
    }

    console.log(`Search complete. Found ${this.searchResults.length} total matches.`);
    this.logSearchResults();
  }

  private getContext(text: string, startIndex: number, contextLength: number): string {
    const start = Math.max(0, startIndex - contextLength);
    const end = Math.min(text.length, startIndex + contextLength);
    return text.substring(start, end);
  }

  private logSearchResults() {
    if (this.searchResults.length > 0) {
      console.group(`Search Results for "${this.searchText}"`);
      this.searchResults.forEach((result, index) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  Page: ${result.pageNumber}`);
        console.log(`  Text: "${result.text}"`);
        console.log(`  Context: ...${result.context}...`);
      });
      console.groupEnd();
    } else {
      console.log(`No matches found for "${this.searchText}"`);
    }
  }

  // Manual search trigger
  searchForText() {
    if (this.searchText.trim()) {
      this.retryCount = 0; // Reset retry count for manual search
      this.automaticSearchTriggered = false; // Allow manual search to override
      this.lastSearchResultMessage = ''; // Reset message tracking
      this.performAutomaticSearch();
    }
  }

  // Close the PDF viewer's find bar
  closeFindBar() {
    const app = (window as any).PDFViewerApplication;
    if (app && app.findBar) {
      app.findBar.close();
      console.log('Find bar closed');
    }
  }

  // Clear search results and close find bar
  clearSearch() {
    this.searchResults = [];
    this.searchComplete = false;
    this.automaticSearchTriggered = false; // Allow automatic search to trigger again
    this.lastSearchResultMessage = ''; // Reset message tracking
    this.closeFindBar();
    console.log('Search cleared');
  }

  // Navigate to next search result
  nextSearchResult() {
    if (this.searchResults.length > 0) {
      // Use PDF viewer's built-in navigation
      const findNext = document.querySelector('#findNext') as HTMLButtonElement;
      if (findNext) {
        findNext.click();
        
        // Update the current index after a delay
        setTimeout(() => {
          this.updateCurrentSearchIndex();
        }, 200);
      } else {
        // Fallback to manual navigation
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults[0].total;
        console.log(`Navigating to result ${this.currentSearchIndex + 1}`);
      }
    }
  }

  // Navigate to previous search result
  previousSearchResult() {
    if (this.searchResults.length > 0) {
      // Use PDF viewer's built-in navigation
      const findPrevious = document.querySelector('#findPrevious') as HTMLButtonElement;
      if (findPrevious) {
        findPrevious.click();
        
        // Update the current index after a delay
        setTimeout(() => {
          this.updateCurrentSearchIndex();
        }, 200);
      } else {
        // Fallback to manual navigation
        this.currentSearchIndex = this.currentSearchIndex > 0 
          ? this.currentSearchIndex - 1 
          : this.searchResults[0].total - 1;
        console.log(`Navigating to result ${this.currentSearchIndex + 1}`);
      }
    }
  }

  private updateCurrentSearchIndex() {
    const findMsg = document.querySelector('#findMsg');
    if (findMsg && this.searchResults.length > 0) {
      const resultText = findMsg.textContent || '';
      const match = resultText.match(/(\d+)\s+of\s+(\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const previousIndex = this.currentSearchIndex;
        this.currentSearchIndex = current - 1; // Convert to 0-based index
        this.searchResults[0].current = current;
        
        // Only log if the index actually changed
        if (previousIndex !== this.currentSearchIndex) {
          console.log(`Updated to result ${current} of ${this.searchResults[0].total}`);
        }
      }
    }
  }

  private listenForSearchResults(findController: any) {
    // Override the updateUIResultsCount method to capture results
    const originalUpdateUIResultsCount = findController.updateUIResultsCount?.bind(findController);
    
    if (originalUpdateUIResultsCount) {
      findController.updateUIResultsCount = (matchesCount: any) => {
        console.log('Search results found:', matchesCount);
        
        if (matchesCount && matchesCount.total > 0) {
          this.searchResults = [{
            total: matchesCount.total,
            current: matchesCount.current || 1,
            text: this.searchText
          }];
          console.log(`Found ${matchesCount.total} matches for "${this.searchText}"`);
        } else {
          this.searchResults = [];
          console.log(`No matches found for "${this.searchText}"`);
        }
        
        this.searchComplete = true;
        this.isSearching = false;
        
        // Call original method to maintain PDF viewer functionality
        return originalUpdateUIResultsCount(matchesCount);
      };
    }
  }

  private checkSearchResults() {
    const findMsg = document.querySelector('#findMsg');
    if (findMsg) {
      const resultText = findMsg.textContent || '';
      
      // Only log if we haven't logged this exact message recently
      if (resultText !== this.lastSearchResultMessage) {
        console.log('Search result message:', resultText);
        this.lastSearchResultMessage = resultText;
      }
      
      // Parse the result message (e.g., "1 of 3 matches")
      const match = resultText.match(/(\d+)\s+of\s+(\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        this.searchResults = [{
          total: total,
          current: current,
          text: this.searchText
        }];
        if (resultText !== this.lastSearchResultMessage) {
          console.log(`Parsed results: ${current} of ${total} matches`);
        }
      } else if (resultText.includes('not found')) {
        this.searchResults = [];
        if (resultText !== this.lastSearchResultMessage) {
          console.log('No matches found');
        }
      }
    }
    
    this.searchComplete = true;
    this.isSearching = false;
  }
}
