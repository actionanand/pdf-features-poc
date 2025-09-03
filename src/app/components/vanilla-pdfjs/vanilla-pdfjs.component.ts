import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';

import { environment as env } from '../../../environments/environment';

// Configure PDF.js worker - use the .mjs file from ngx-extended-pdf-viewer assets
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

@Component({
  selector: 'app-vanilla-pdfjs',
  templateUrl: './vanilla-pdfjs.component.html',
  styleUrls: ['./vanilla-pdfjs.component.scss']
})
export class VanillaPdfjsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('textLayer', { static: false }) textLayerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  
  // PDF.js properties
  pdfDocument?: any; // PDFDocumentProxy type
  currentPage = 1;
  totalPages = 0;
  scale = 1.5;
  zoom = 1.5;
  rotation = 0;
  isLoading = false;
  error: string | null = null;
  renderTask?: any;
  
  // Canvas properties
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  textLayerElement?: HTMLDivElement;
  pagePositions: Array<{pageNumber: number, top: number, bottom: number}> = [];
  
  // UI state
  showThumbnails = false;
  showToolbar = true;
  continuousScroll = false;
  thumbnails: any[] = [];
  searchText = ''; // Start with empty search
  searchResults: any[] = [];
  highlightedResults: any[] = [];
  isSearching = false;
  currentSearchIndex = 0;
  
  // PDF source management
  pdfUrl = env.pdfUrlMozilla;
  pdfSource: 'url' | 'file' = 'url'; // Track whether PDF is from URL or file
  pdfFileName: string | null = null; // Store uploaded file name
  uploadedPdfData: ArrayBuffer | null = null; // Store uploaded file data
  
  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Initialize PDF.js worker configuration
    this.initializePdfJs();
  }

  private initializePdfJs() {
    // Ensure worker is configured to use the .mjs worker file from ngx-extended-pdf-viewer
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    }
    
    console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    console.log('Using .mjs worker file from ngx-extended-pdf-viewer assets');
  }

  ngAfterViewInit(): void {
    console.log('Vanilla PDF.js component initialized');
    
    // Canvas should now be available immediately since it's always in the DOM
    setTimeout(() => {
      this.initializeCanvas();
      this.setupScrollListener();
    }, 50);
  }

  private initializeCanvas(): void {
    console.log('Initializing canvas...');
    console.log('pdfCanvas ViewChild:', this.pdfCanvas);
    console.log('textLayerRef ViewChild:', this.textLayerRef);
    
    if (this.pdfCanvas?.nativeElement) {
      this.canvas = this.pdfCanvas.nativeElement;
      this.context = this.canvas.getContext('2d') || undefined;
      console.log('Canvas initialized successfully:', this.canvas);
      
      if (this.textLayerRef?.nativeElement) {
        this.textLayerElement = this.textLayerRef.nativeElement;
        console.log('Text layer initialized successfully');
      }
      
      // Load PDF now that canvas is ready
      this.loadPdf();
    } else {
      console.error('Canvas element still not found. Check template structure.');
      setTimeout(() => this.initializeCanvas(), 100);
    }
  }

  private setupScrollListener(): void {
    // Add scroll listener to the PDF viewer area for continuous scroll detection
    setTimeout(() => {
      const pdfViewerArea = document.querySelector('.pdf-viewer-area') as HTMLElement;
      if (pdfViewerArea) {
        let scrollTimeout: any;
        let isScrolling = false;
        
        pdfViewerArea.addEventListener('scroll', () => {
          if (this.continuousScroll && this.pagePositions.length > 0 && !isScrolling) {
            // Throttle scroll events for better performance
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              isScrolling = true;
              try {
                this.updateCurrentPageFromScroll();
              } catch (error) {
                console.error('Error updating page from scroll:', error);
              } finally {
                isScrolling = false;
              }
            }, 50); // Reduced timeout for more responsive scrolling
          }
        });
        console.log('Scroll listener attached to PDF viewer area');
      } else {
        console.warn('PDF viewer area not found for scroll listener');
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.renderTask) {
      this.renderTask.cancel();
    }
  }

  async loadPdf() {
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('Loading PDF with vanilla PDF.js');
      console.log('PDF source:', this.pdfSource);
      console.log('PDF.js worker configured at:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      
      // Double check worker configuration
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
        console.log('Worker reconfigured to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      }
      
      let typedArray: Uint8Array;
      
      if (this.pdfSource === 'file' && this.uploadedPdfData) {
        // Load from uploaded file data
        console.log('Loading from uploaded file:', this.pdfFileName);
        typedArray = new Uint8Array(this.uploadedPdfData);
      } else {
        // Load from URL
        console.log('Loading from URL:', this.pdfUrl);
        const response = await this.http.get(this.pdfUrl, { 
          responseType: 'arraybuffer' 
        }).toPromise();
        
        if (!response) {
          throw new Error('Failed to fetch PDF from URL');
        }
        
        typedArray = new Uint8Array(response);
      }
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument(typedArray);
      this.pdfDocument = await loadingTask.promise;
      
      this.totalPages = this.pdfDocument.numPages;
      console.log('PDF loaded successfully. Total pages:', this.totalPages);
      
      // Reset to single page mode when loading a new PDF
      this.continuousScroll = false;
      this.currentPage = 1;
      
      // Clear any existing state
      this.pagePositions = [];
      this.searchResults = [];
      this.highlightedResults = [];
      this.currentSearchIndex = 0;
      this.showThumbnails = false;
      
      // Auto-show thumbnails for multi-page documents
      if (this.totalPages > 1) {
        this.showThumbnails = true;
      }
      
      // Wait for canvas to be ready with retry mechanism
      this.waitForCanvasAndRender();
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.error = 'Failed to load PDF. Please check your internet connection and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private waitForCanvasAndRender(attempts: number = 0): void {
    const maxAttempts = 20;
    const delay = 100;
    
    if (this.canvas && this.context) {
      console.log('Canvas is ready, starting render process');
      // Render first page
      this.renderPage(1).then(() => {
        // Generate thumbnails
        setTimeout(() => this.generateThumbnails(), 1000);
        
        // Perform automatic search for testing
        setTimeout(() => this.performSearch(), 3000);
      });
      return;
    }
    
    if (attempts < maxAttempts) {
      console.log(`Waiting for canvas (attempt ${attempts + 1}/${maxAttempts})...`);
      setTimeout(() => this.waitForCanvasAndRender(attempts + 1), delay);
    } else {
      console.error('Canvas still not ready after waiting. Check ViewChild initialization.');
      this.error = 'Canvas initialization failed. Please refresh the page.';
    }
  }

  async renderPage(pageNumber: number) {
    if (!this.pdfDocument || pageNumber < 1 || pageNumber > this.totalPages || !this.canvas || !this.context) {
      return;
    }

    try {
      // Cancel any ongoing render task
      if (this.renderTask) {
        this.renderTask.cancel();
      }

      const page = await this.pdfDocument.getPage(pageNumber);
      
      // Calculate viewport with zoom and rotation
      let viewport = page.getViewport({ 
        scale: this.zoom,
        rotation: this.rotation 
      });

      // Set canvas dimensions
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
      this.canvas.style.width = viewport.width + 'px';
      this.canvas.style.height = viewport.height + 'px';

      // Clear canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Render PDF page
      const renderContext = {
        canvasContext: this.context,
        viewport: viewport
      };

      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;

      // Render text layer for search functionality
      await this.renderTextLayer(page, viewport);

      this.currentPage = pageNumber;
      console.log('Page rendered:', pageNumber);

    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    }
  }

  async renderAllPages() {
    if (!this.pdfDocument || !this.canvas || !this.context) {
      return;
    }

    try {
      console.log('Rendering all pages for continuous scroll...');
      
      // Reset page positions tracking
      this.pagePositions = [];
      
      // Calculate total height needed for all pages
      let totalHeight = 0;
      let maxWidth = 0;
      const pageViewports: any[] = [];
      
      // First pass: calculate dimensions
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        try {
          const page = await this.pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ 
            scale: this.zoom,
            rotation: this.rotation 
          });
          pageViewports.push(viewport);
          
          // Track page positions
          const pageTop = totalHeight;
          const pageBottom = totalHeight + viewport.height;
          this.pagePositions.push({
            pageNumber: pageNum,
            top: pageTop,
            bottom: pageBottom
          });
          
          totalHeight += viewport.height + 20; // Add margin between pages
          maxWidth = Math.max(maxWidth, viewport.width);
        } catch (error) {
          console.error(`Error calculating dimensions for page ${pageNum}:`, error);
          // Skip this page and continue with others
          pageViewports.push(null);
        }
      }

      // Set canvas dimensions for all pages
      this.canvas.width = maxWidth;
      this.canvas.height = totalHeight;
      this.canvas.style.width = maxWidth + 'px';
      this.canvas.style.height = totalHeight + 'px';

      // Clear canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Second pass: render all pages
      let currentY = 0;
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        try {
          const viewport = pageViewports[pageNum - 1];
          
          // Skip if this page failed to load
          if (!viewport) {
            console.warn(`Skipping page ${pageNum} due to previous error`);
            continue;
          }
          
          const page = await this.pdfDocument.getPage(pageNum);
          
          // Save context state
          this.context.save();
          
          // Translate to the correct position for this page
          this.context.translate((maxWidth - viewport.width) / 2, currentY);
          
          // Create a temporary canvas for this page
          const tempCanvas = document.createElement('canvas');
          const tempContext = tempCanvas.getContext('2d');
          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;
          
          if (tempContext) {
            const renderContext = {
              canvasContext: tempContext,
              viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Draw the page onto the main canvas
            this.context.drawImage(tempCanvas, 0, 0);
          }
          
          // Restore context state
          this.context.restore();
          
          currentY += viewport.height + 20; // Add margin
        } catch (error) {
          console.error(`Error rendering page ${pageNum}:`, error);
          // Restore context state if it was saved
          this.context.restore();
          // Continue with next page
          const viewport = pageViewports[pageNum - 1];
          if (viewport) {
            currentY += viewport.height + 20;
          }
        }
      }

      // Clear and recreate text layer for all pages
      if (this.textLayerRef?.nativeElement && this.canvas) {
        this.textLayerRef.nativeElement.innerHTML = '';
        
        // Position text layer exactly over the canvas, accounting for thumbnail sidebar
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.textLayerRef.nativeElement.parentElement?.getBoundingClientRect();
        
        if (containerRect) {
          let offsetX = canvasRect.left - containerRect.left;
          const offsetY = canvasRect.top - containerRect.top;
          
          // When thumbnails are visible, adjust positioning to account for layout shifts
          if (this.showThumbnails) {
            // More precise adjustment for thumbnail sidebar effect
            offsetX -= 5; // Increase adjustment to fix the right shift more precisely
          }
          
          // Adjust for canvas border (1px) to align text layer precisely with canvas content area
          offsetX += 1; // Account for 1px canvas border
          const adjustedOffsetY = offsetY + 1; // Account for 1px canvas border
          
          this.textLayerRef.nativeElement.style.left = offsetX + 'px';
          this.textLayerRef.nativeElement.style.top = adjustedOffsetY + 'px';
          this.textLayerRef.nativeElement.style.width = (canvasRect.width - 2) + 'px'; // Subtract 2px for borders
          this.textLayerRef.nativeElement.style.height = (canvasRect.height - 2) + 'px'; // Subtract 2px for borders
          
          // Apply CSS transform when thumbnails are visible to improve text alignment
          if (this.showThumbnails) {
            this.textLayerRef.nativeElement.style.transform = 'scaleX(0.98)';
            this.textLayerRef.nativeElement.style.transformOrigin = '0 0';
          } else {
            this.textLayerRef.nativeElement.style.transform = 'none';
          }
        } else {
          // Fallback positioning
          this.textLayerRef.nativeElement.style.width = maxWidth + 'px';
          this.textLayerRef.nativeElement.style.height = totalHeight + 'px';
        }
        
        // Render text layer for all pages
        currentY = 0;
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
          try {
            const viewport = pageViewports[pageNum - 1];
            
            // Skip if this page failed to load
            if (!viewport) {
              console.warn(`Skipping text layer for page ${pageNum} due to previous error`);
              continue;
            }
            
            const page = await this.pdfDocument.getPage(pageNum);
            await this.renderTextLayerForPage(page, viewport, (maxWidth - viewport.width) / 2, currentY);
            currentY += viewport.height + 20;
          } catch (error) {
            console.error(`Error rendering text layer for page ${pageNum}:`, error);
            // Continue with next page
            const viewport = pageViewports[pageNum - 1];
            if (viewport) {
              currentY += viewport.height + 20;
            }
          }
        }
      }

      console.log('All pages rendered for continuous scroll');
      console.log('Page positions tracked:', this.pagePositions);

    } catch (error) {
      console.error('Error rendering all pages:', error);
    }
  }

  private updateCurrentPageFromScroll(): void {
    try {
      const pdfViewerArea = document.querySelector('.pdf-viewer-area') as HTMLElement;
      if (!pdfViewerArea || this.pagePositions.length === 0) return;

      const scrollTop = pdfViewerArea.scrollTop;
      const containerHeight = pdfViewerArea.clientHeight;
      const viewportCenter = scrollTop + containerHeight / 2;

      // Find which page is currently in the center of the viewport
      for (const pagePos of this.pagePositions) {
        if (viewportCenter >= pagePos.top && viewportCenter <= pagePos.bottom) {
          if (this.currentPage !== pagePos.pageNumber) {
            this.currentPage = pagePos.pageNumber;
            console.log('Current page updated to:', this.currentPage);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error in updateCurrentPageFromScroll:', error);
    }
  }

  private async renderTextLayer(page: any, viewport: any) {
    if (!this.textLayerRef?.nativeElement || !this.canvas) return;

    try {
      // Clear existing text layer
      this.textLayerRef.nativeElement.innerHTML = '';
      
      // Position text layer exactly over the canvas, accounting for thumbnail sidebar
      const canvasRect = this.canvas.getBoundingClientRect();
      const containerRect = this.textLayerRef.nativeElement.parentElement?.getBoundingClientRect();
      
      if (containerRect) {
        let offsetX = canvasRect.left - containerRect.left;
        const offsetY = canvasRect.top - containerRect.top;
        
        // When thumbnails are visible, adjust positioning to account for layout shifts
        if (this.showThumbnails) {
          // More precise adjustment for thumbnail sidebar effect
          offsetX -= 11; // Increase adjustment to fix the right shift more precisely
        }
        
        // Adjust for canvas border (1px) to align text layer precisely with canvas content area
        offsetX += 1; // Account for 1px canvas border
        const adjustedOffsetY = offsetY + 1; // Account for 1px canvas border
        
        this.textLayerRef.nativeElement.style.left = offsetX + 'px';
        this.textLayerRef.nativeElement.style.top = adjustedOffsetY + 'px';
        this.textLayerRef.nativeElement.style.width = (canvasRect.width - 2) + 'px'; // Subtract 2px for borders
        this.textLayerRef.nativeElement.style.height = (canvasRect.height - 2) + 'px'; // Subtract 2px for borders
        
        // Remove any transforms when thumbnails are off
        if (!this.showThumbnails) {
          this.textLayerRef.nativeElement.style.transform = 'none';
        } else {
          // Apply CSS transform when thumbnails are visible to improve text alignment
          this.textLayerRef.nativeElement.style.transform = 'scaleX(0.98)';
          this.textLayerRef.nativeElement.style.transformOrigin = '0 0';
        }
      } else {
        // Fallback positioning
        this.textLayerRef.nativeElement.style.width = viewport.width + 'px';
        this.textLayerRef.nativeElement.style.height = viewport.height + 'px';
      }

      // Get text content
      const textContent = await page.getTextContent();

      // Manual text rendering with corrected positioning
      textContent.items.forEach((item: any, itemIndex: number) => {
        if (!this.textLayerRef?.nativeElement || !item.str.trim()) return;
        
        const textSpan = document.createElement('span');
        textSpan.style.position = 'absolute';
        
        // Calculate position - text positions are relative to the text layer, not the canvas
        const transform = item.transform;
        const x = transform[4] * viewport.scale;
        const y = viewport.height - transform[5] * viewport.scale;
        
        // Calculate width based on text content and transform matrix
        const scaleX = Math.abs(transform[0]);
        let textWidth = item.width * viewport.scale * scaleX;
        
        // Calculate font size with adjustment for thumbnails
        let fontSize = item.height * viewport.scale * 0.91;
        let letterSpacing = 'normal';
        
        // When thumbnails are visible, adjust font properties to fix selection length
        if (this.showThumbnails) {
          fontSize = fontSize * 0.95; // Slightly reduce font size when thumbnails are shown
          letterSpacing = '-0.1px'; // Tighten letter spacing to compact text
        }
        
        // Check if this text item should be highlighted
        const shouldHighlight = this.shouldHighlightTextItem(item, this.currentPage);
        
        // FORCE HIGHLIGHT TEST: Highlight any text containing "the"
        const forceHighlight = item.str.toLowerCase().includes(this.searchText.toLowerCase()) && this.searchText.trim().length > 0;
        
        // Debug logging
        if (shouldHighlight) {
          console.log(`HIGHLIGHTING: "${item.str}" on page ${this.currentPage}`);
        }
        if (forceHighlight) {
          console.log(`FORCE HIGHLIGHTING: "${item.str}" contains "${this.searchText}"`);
        }
        
        // Since text layer is positioned over canvas, no additional offset needed
        textSpan.style.left = x + 'px';
        textSpan.style.top = (y - item.height * viewport.scale * 0.8) + 'px'; // Adjust vertical position to align with baseline
        textSpan.style.fontSize = fontSize + 'px';
        // Don't set width - let the text determine its own width for proper highlighting
        // textSpan.style.width = textWidth + 'px'; // Removed to fix highlighting width
        textSpan.style.height = (item.height * viewport.scale) + 'px'; // Set explicit height
        textSpan.style.fontFamily = 'sans-serif';
        textSpan.style.whiteSpace = 'pre';
        textSpan.style.margin = '0';
        textSpan.style.padding = '0';
        textSpan.style.overflow = 'hidden'; // Prevent text from overflowing
        textSpan.style.letterSpacing = letterSpacing;
        textSpan.style.wordSpacing = 'normal';
        
        // Apply highlighting if needed - make it very visible
        if (shouldHighlight || forceHighlight) {
          textSpan.style.backgroundColor = '#00FF00'; // Bright green background
          textSpan.style.color = '#000000'; // Black text
          textSpan.style.border = '2px solid #FF0000'; // Red border for visibility
          textSpan.style.fontWeight = 'bold';
          textSpan.style.zIndex = '1000';
          textSpan.style.borderRadius = '3px';
          textSpan.style.display = 'block'; // Ensure it's visible
          textSpan.style.opacity = '1'; // Ensure full opacity
          console.log(`Applied highlighting styles to: "${item.str}"`);
        } else {
          textSpan.style.color = 'transparent'; // Normal transparent text for selection
          textSpan.style.backgroundColor = 'transparent';
        }
        
        textSpan.textContent = item.str;
        this.textLayerRef.nativeElement.appendChild(textSpan);
      });

      console.log('Text layer rendered with', textContent.items.length, 'items');

    } catch (error) {
      console.error('Error rendering text layer:', error);
    }
  }

  private async renderTextLayerManual(page: any, viewport: any) {
    if (!this.textLayerRef?.nativeElement) return;

    try {
      const textContent = await page.getTextContent();

      // Create text layer manually with precise positioning
      textContent.items.forEach((item: any) => {
        if (!this.textLayerRef?.nativeElement || !item.str.trim()) return;
        
        const textDiv = document.createElement('span');
        textDiv.style.position = 'absolute';
        
        // Use the exact transform matrix from PDF.js
        const tx = item.transform;
        const x = tx[4];
        const y = tx[5];
        const scaleX = Math.abs(tx[0]);
        const scaleY = Math.abs(tx[3]);
        const fontSize = item.height;
        
        // More precise positioning calculation
        const scaledX = x * viewport.scale;
        const scaledY = (viewport.height - y * viewport.scale) - (fontSize * viewport.scale * 0.8); // Adjust vertical position to align with baseline
        
        textDiv.style.left = scaledX + 'px';
        textDiv.style.top = scaledY + 'px';
        textDiv.style.fontSize = (fontSize * viewport.scale * 0.91) + 'px'; // Reduce font size to match better
        
        // Apply horizontal scaling if needed
        if (Math.abs(scaleX - 1) > 0.1) {
          textDiv.style.transform = `scaleX(${scaleX})`;
        }
        
        textDiv.style.fontFamily = 'sans-serif';
        textDiv.style.color = 'transparent';
        textDiv.style.whiteSpace = 'pre';
        textDiv.style.userSelect = 'text';
        textDiv.style.pointerEvents = 'auto';
        textDiv.style.lineHeight = '1';
        textDiv.style.transformOrigin = '0 0';
        textDiv.style.margin = '0';
        textDiv.style.padding = '0';
        textDiv.style.border = 'none';
        textDiv.style.background = 'transparent';
        textDiv.textContent = item.str;
        
        this.textLayerRef.nativeElement.appendChild(textDiv);
      });

    } catch (error) {
      console.error('Error rendering text layer manually:', error);
    }
  }

  private async renderTextLayerForPage(page: any, viewport: any, offsetX: number, offsetY: number) {
    if (!this.textLayerRef?.nativeElement) return;

    try {
      // Get text content
      const textContent = await page.getTextContent();

      // Create text layer manually with offset positioning for continuous scroll
      textContent.items.forEach((item: any) => {
        if (!this.textLayerRef?.nativeElement || !item.str.trim()) return;
        
        const textSpan = document.createElement('span');
        textSpan.style.position = 'absolute';
        
        // Calculate position using the viewport scale with offset
        const transform = item.transform;
        const x = offsetX + (transform[4] * viewport.scale);
        const y = offsetY + (viewport.height - transform[5] * viewport.scale);
        
        // Calculate width based on text content and transform matrix
        const scaleX = Math.abs(transform[0]);
        let textWidth = item.width * viewport.scale * scaleX;
        
        // Calculate font size with adjustment for thumbnails
        let fontSize = item.height * viewport.scale * 0.91;
        let letterSpacing = 'normal';
        
        // When thumbnails are visible, adjust font properties to fix selection length
        if (this.showThumbnails) {
          fontSize = fontSize * 0.95; // Slightly reduce font size when thumbnails are shown
          letterSpacing = '-0.1px'; // Tighten letter spacing to compact text
        }
        
        // Check if this text item should be highlighted (get page number from offsetY)
        const pageNumber = this.getPageNumberFromOffset(offsetY);
        const shouldHighlight = this.shouldHighlightTextItem(item, pageNumber);
        
        // FORCE HIGHLIGHT TEST: Highlight any text containing the search term
        const forceHighlight = item.str.toLowerCase().includes(this.searchText.toLowerCase()) && this.searchText.trim().length > 0;
        
        // Debug logging
        if (shouldHighlight) {
          console.log(`HIGHLIGHTING CONTINUOUS: "${item.str}" on page ${pageNumber}`);
        }
        if (forceHighlight) {
          console.log(`FORCE HIGHLIGHTING CONTINUOUS: "${item.str}" contains "${this.searchText}"`);
        }
        
        textSpan.style.left = x + 'px';
        textSpan.style.top = (y - item.height * viewport.scale * 0.8) + 'px'; // Adjust vertical position to align with baseline
        textSpan.style.fontSize = fontSize + 'px';
        // Don't set width - let the text determine its own width for proper highlighting
        // textSpan.style.width = textWidth + 'px'; // Removed to fix highlighting width
        textSpan.style.height = (item.height * viewport.scale) + 'px'; // Set explicit height
        textSpan.style.fontFamily = 'sans-serif';
        textSpan.style.whiteSpace = 'pre';
        textSpan.style.margin = '0';
        textSpan.style.padding = '0';
        textSpan.style.overflow = 'hidden'; // Prevent text from overflowing
        textSpan.style.letterSpacing = letterSpacing;
        textSpan.style.wordSpacing = 'normal';
        
        // Apply highlighting if needed - make it very visible
        if (shouldHighlight || forceHighlight) {
          textSpan.style.backgroundColor = '#00FF00'; // Bright green background
          textSpan.style.color = '#000000'; // Black text
          textSpan.style.border = '2px solid #FF0000'; // Red border for visibility
          textSpan.style.fontWeight = 'bold';
          textSpan.style.zIndex = '1000';
          textSpan.style.borderRadius = '3px';
          textSpan.style.display = 'block'; // Ensure it's visible
          textSpan.style.opacity = '1'; // Ensure full opacity
          console.log(`Applied highlighting styles to: "${item.str}" on page ${pageNumber}`);
        } else {
          textSpan.style.color = 'transparent'; // Normal transparent text for selection
          textSpan.style.backgroundColor = 'transparent';
        }
        
        textSpan.textContent = item.str;
        this.textLayerRef.nativeElement.appendChild(textSpan);
      });

    } catch (error) {
      console.error('Error rendering text layer for page:', error);
    }
  }

  async generateThumbnails() {
    if (!this.pdfDocument) return;
    
    this.thumbnails = [];
    console.log('Generating thumbnails for', this.totalPages, 'pages');
    
    try {
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.15 });
        
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
          this.thumbnails.push({
            pageNumber: pageNum,
            dataUrl: thumbnailData,
            width: canvas.width,
            height: canvas.height
          });
        }
      }
      
      console.log(`Generated ${this.thumbnails.length} thumbnails successfully`);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    }
  }

  // Navigation methods
  async previousPage() {
    if (this.currentPage > 1) {
      await this.renderPage(this.currentPage - 1);
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      await this.renderPage(this.currentPage + 1);
    }
  }

  async goToPage() {
    // Ensure the page number is within valid range
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    await this.renderPage(this.currentPage);
  }

  async goToPageFromThumbnail(pageNumber: number) {
    if (this.continuousScroll) {
      this.scrollToPage(pageNumber);
    } else {
      await this.renderPage(pageNumber);
    }
  }

  private scrollToPage(pageNumber: number): void {
    const canvasContainer = this.canvas?.parentElement;
    if (!canvasContainer || this.pagePositions.length === 0) return;

    const pagePos = this.pagePositions.find(p => p.pageNumber === pageNumber);
    if (pagePos) {
      canvasContainer.scrollTo({
        top: pagePos.top,
        behavior: 'smooth'
      });
      this.currentPage = pageNumber;
      console.log('Scrolled to page:', pageNumber);
    }
  }

  // Zoom methods
  async zoomIn() {
    this.zoom = Math.min(this.zoom + 0.25, 3.0);
    if (this.continuousScroll) {
      await this.renderAllPages();
    } else {
      await this.renderPage(this.currentPage);
    }
  }

  async zoomOut() {
    this.zoom = Math.max(this.zoom - 0.25, 0.25);
    if (this.continuousScroll) {
      await this.renderAllPages();
    } else {
      await this.renderPage(this.currentPage);
    }
  }

  async resetZoom() {
    this.zoom = 1.0;
    if (this.continuousScroll) {
      await this.renderAllPages();
    } else {
      await this.renderPage(this.currentPage);
    }
  }

  // Rotation methods
  async rotateClockwise() {
    this.rotation += 90;
    if (this.rotation >= 360) this.rotation = 0;
    if (this.continuousScroll) {
      await this.renderAllPages();
    } else {
      await this.renderPage(this.currentPage);
    }
  }

  async rotateCounterClockwise() {
    this.rotation -= 90;
    if (this.rotation < 0) this.rotation = 270;
    if (this.continuousScroll) {
      await this.renderAllPages();
    } else {
      await this.renderPage(this.currentPage);
    }
  }

  // UI toggles
  toggleThumbnails() {
    this.showThumbnails = !this.showThumbnails;
    
    // Re-render text layer to adjust positioning for thumbnail sidebar
    setTimeout(() => {
      if (this.continuousScroll) {
        this.renderAllPages();
      } else if (this.pdfDocument) {
        this.pdfDocument.getPage(this.currentPage).then((page: any) => {
          const viewport = page.getViewport({ 
            scale: this.zoom,
            rotation: this.rotation 
          });
          this.renderTextLayer(page, viewport);
        });
      }
    }, 100); // Small delay to ensure CSS changes have been applied
  }

  toggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  toggleContinuousScroll() {
    // If trying to enable continuous scroll, check for large PDFs
    if (!this.continuousScroll) {
      // Check if PDF is large and might cause performance issues
      if (this.totalPages > 50) {
        const proceed = confirm(
          `This PDF has ${this.totalPages} pages. Rendering all pages in continuous scroll mode may consume significant memory and could potentially crash your browser.\n\nDo you want to continue?`
        );
        
        if (!proceed) {
          return; // Don't enable continuous scroll
        }
      }
    }
    
    this.continuousScroll = !this.continuousScroll;
    
    // Clear any existing render tasks to prevent conflicts
    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }
    
    if (this.continuousScroll) {
      this.renderAllPages();
    } else {
      // Switch back to single page mode
      this.pagePositions = []; // Clear page positions
      
      // Reset scroll position
      const pdfViewerArea = document.querySelector('.pdf-viewer-area') as HTMLElement;
      if (pdfViewerArea) {
        pdfViewerArea.scrollTop = 0;
      }
      this.renderPage(this.currentPage);
    }
  }

  // Clear search highlights and re-render pages
  clearSearchHighlights() {
    console.log('Clearing search highlights');
    this.searchResults = [];
    this.highlightedResults = [];
    this.currentSearchIndex = 0;
    
    // Re-render current page or all pages if in continuous mode to remove highlights
    if (this.continuousScroll) {
      this.renderAllPages();
    } else {
      this.renderPage(this.currentPage);
    }
  }

  // Handle search input changes
  onSearchInputChange() {
    // If search text is cleared, clear highlights immediately
    if (!this.searchText.trim()) {
      this.clearSearchHighlights();
    } else {
      // Re-render to show new highlights for the current input
      if (this.continuousScroll) {
        this.renderAllPages();
      } else {
        this.renderPage(this.currentPage);
      }
    }
  }

  // Clear search text and highlights
  clearSearch() {
    this.searchText = '';
    this.clearSearchHighlights();
  }

  // Search functionality
  async performSearch() {
    // If search text is empty, clear highlights
    if (!this.searchText.trim()) {
      this.clearSearchHighlights();
      return;
    }
    
    if (!this.pdfDocument) {
      console.log('Search skipped: no PDF document');
      return;
    }

    console.log('Starting search for:', this.searchText);
    this.isSearching = true;
    this.searchResults = [];
    this.highlightedResults = [];
    this.currentSearchIndex = 0;

    try {
      console.log(`Searching for "${this.searchText}" across ${this.totalPages} pages`);
      
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract all text from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        console.log(`Page ${pageNum} text preview:`, pageText.substring(0, 200) + '...');

        // Search for the text (case-insensitive)
        const searchRegex = new RegExp(this.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = [...pageText.matchAll(searchRegex)];

        if (matches.length > 0) {
          console.log(`Found ${matches.length} matches on page ${pageNum}`);
          
          // Find the actual text items that contain the search text
          const pageHighlights = this.findTextItemsForHighlight(textContent.items, this.searchText, pageNum);
          console.log(`Created ${pageHighlights.length} highlight items for page ${pageNum}`);
          this.highlightedResults.push(...pageHighlights);
          
          matches.forEach((match, index) => {
            this.searchResults.push({
              pageNumber: pageNum,
              matchIndex: index,
              text: match[0],
              startIndex: match.index,
              context: this.getContext(pageText, match.index || 0, 100)
            });
          });
        } else {
          console.log(`No matches found on page ${pageNum}`);
        }
      }

      console.log(`Search complete. Found ${this.searchResults.length} total matches.`);
      console.log('Total highlighted items:', this.highlightedResults.length);
      
      if (this.searchResults.length > 0) {
        console.log('Search results:', this.searchResults);
        // Navigate to first search result and highlight
        await this.goToSearchResult(0);
      } else {
        console.log('No search results found. Try a different search term.');
      }
      
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      this.isSearching = false;
    }
  }

  private findTextItemsForHighlight(textItems: any[], searchText: string, pageNumber: number): any[] {
    const highlights: any[] = [];
    const searchLower = searchText.toLowerCase().trim();
    
    if (!searchLower) return highlights;
    
    console.log(`Searching for "${searchLower}" in ${textItems.length} text items on page ${pageNumber}`);
    
    // Look for text items that contain the search text
    textItems.forEach((item, index) => {
      const itemText = item.str.toLowerCase().trim();
      
      // Only highlight if the text item contains the exact search term
      if (itemText.includes(searchLower)) {
        console.log(`MATCH FOUND: "${item.str}" contains "${searchText}" (item index: ${index})`);
        highlights.push({
          pageNumber: pageNumber,
          textItem: item,
          itemIndex: index,
          searchText: searchText,
          matchText: item.str,
          // Store position data for better matching
          transform: item.transform ? [...item.transform] : null,
          width: item.width,
          height: item.height
        });
      }
    });
    
    console.log(`Found ${highlights.length} text items to highlight on page ${pageNumber} for search: "${searchText}"`);
    
    return highlights;
  }

  private shouldHighlightTextItem(item: any, pageNumber: number): boolean {
    if (!this.highlightedResults || this.highlightedResults.length === 0) {
      console.log(`shouldHighlightTextItem: NO HIGHLIGHTS AVAILABLE for "${item.str}"`);
      return false;
    }
    
    // Check if this text item is in our highlighted results for the current page
    // Use multiple matching criteria since object references may change after re-render
    const isHighlighted = this.highlightedResults.some(highlight => {
      if (highlight.pageNumber !== pageNumber) return false;
      
      // Try multiple matching strategies
      const sameObject = highlight.textItem === item;
      const sameText = highlight.matchText === item.str;
      const samePosition = highlight.transform && item.transform && 
        highlight.transform[4] === item.transform[4] && 
        highlight.transform[5] === item.transform[5];
      
      return sameObject || (sameText && samePosition);
    });
    
    if (isHighlighted) {
      console.log(`shouldHighlightTextItem: YES for "${item.str}" on page ${pageNumber}`);
    } else {
      console.log(`shouldHighlightTextItem: NO for "${item.str}" on page ${pageNumber} (checked ${this.highlightedResults.filter(h => h.pageNumber === pageNumber).length} highlights)`);
    }
    
    return isHighlighted;
  }

  private getHighlightInfo(item: any, pageNumber: number): any | null {
    if (!this.highlightedResults || this.highlightedResults.length === 0) {
      return null;
    }
    
    // Find highlight info for this specific text item
    return this.highlightedResults.find(highlight => 
      highlight.pageNumber === pageNumber && 
      highlight.textItem === item
    ) || null;
  }

  private createPreciseHighlight(item: any, highlightInfo: any, x: number, y: number, fontSize: number, scale: number) {
    if (!this.textLayerRef?.nativeElement || !highlightInfo) return;
    
    // Create a temporary text measurement element
    const measureElement = document.createElement('span');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.fontSize = fontSize + 'px';
    measureElement.style.fontFamily = 'sans-serif';
    measureElement.style.whiteSpace = 'pre';
    measureElement.style.letterSpacing = this.showThumbnails ? '-0.1px' : '0px';
    
    // Measure the text before the highlight
    measureElement.textContent = highlightInfo.beforeText;
    document.body.appendChild(measureElement);
    const beforeWidth = measureElement.getBoundingClientRect().width;
    
    // Measure the highlighted text
    measureElement.textContent = highlightInfo.matchText;
    const matchWidth = measureElement.getBoundingClientRect().width;
    
    // Clean up measurement element
    document.body.removeChild(measureElement);
    
    // Create highlight element
    const highlightSpan = document.createElement('span');
    highlightSpan.style.position = 'absolute';
    highlightSpan.style.left = (x + beforeWidth) + 'px';
    highlightSpan.style.top = (y - item.height * scale * 0.8) + 'px';
    highlightSpan.style.width = matchWidth + 'px';
    highlightSpan.style.height = (item.height * scale) + 'px';
    highlightSpan.style.backgroundColor = 'rgba(255, 255, 0, 0.6)'; // Yellow highlight
    highlightSpan.style.border = '1px solid rgba(255, 200, 0, 0.8)';
    highlightSpan.style.zIndex = '999'; // Below text but above canvas
    highlightSpan.style.pointerEvents = 'none'; // Don't interfere with text selection
    highlightSpan.className = 'pdf-highlight';
    
    this.textLayerRef.nativeElement.appendChild(highlightSpan);
  }

  private getPageNumberFromOffset(offsetY: number): number {
    // Find which page this offset corresponds to
    for (const pagePos of this.pagePositions) {
      if (offsetY >= pagePos.top && offsetY <= pagePos.bottom) {
        return pagePos.pageNumber;
      }
    }
    // If not found in page positions, estimate based on offset
    return Math.ceil((offsetY + 1) / 600); // Rough estimate
  }

  private getContext(text: string, startIndex: number, contextLength: number): string {
    const start = Math.max(0, startIndex - contextLength);
    const end = Math.min(text.length, startIndex + contextLength);
    return text.substring(start, end);
  }

  async goToSearchResult(index: number) {
    if (index >= 0 && index < this.searchResults.length) {
      this.currentSearchIndex = index;
      const result = this.searchResults[index];
      console.log(`Navigating to search result ${index + 1} on page ${result.pageNumber}`);
      console.log(`Total highlighted results available: ${this.highlightedResults.length}`);
      console.log(`Highlighted results for page ${result.pageNumber}:`, 
        this.highlightedResults.filter(h => h.pageNumber === result.pageNumber));
      
      await this.renderPage(result.pageNumber);
      console.log(`Rendered page ${result.pageNumber} - highlights should now be visible`);
    }
  }

  async nextSearchResult() {
    if (this.searchResults.length > 0) {
      const nextIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
      await this.goToSearchResult(nextIndex);
    }
  }

  async previousSearchResult() {
    if (this.searchResults.length > 0) {
      const prevIndex = this.currentSearchIndex > 0 
        ? this.currentSearchIndex - 1 
        : this.searchResults.length - 1;
      await this.goToSearchResult(prevIndex);
    }
  }

  // Download and print methods
  downloadPdf() {
    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = 'document.pdf';
    link.click();
  }

  printPdf() {
    const printWindow = window.open(this.pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  // Manual search trigger
  async triggerSearch() {
    await this.performSearch();
  }

  // Clear all highlights
  clearHighlights() {
    this.highlightedResults = [];
    this.searchResults = [];
    // Re-render current page to remove highlights
    if (this.continuousScroll) {
      this.renderAllPages();
    } else if (this.pdfDocument) {
      this.renderPage(this.currentPage);
    }
  }

  // File upload methods
  onUploadPdf() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.pdfFileName = file.name;
      this.pdfSource = 'file';
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedPdfData = e.target?.result as ArrayBuffer;
        this.loadPdf();
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please select a valid PDF file.');
    }
  }

  loadDefaultPdf() {
    this.pdfSource = 'url';
    this.pdfFileName = null;
    this.uploadedPdfData = null;
    this.loadPdf();
  }

  // Utility methods
  get Math() {
    return Math;
  }
}
