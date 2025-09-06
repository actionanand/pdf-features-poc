import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { VanillaPdfjsComponent } from './vanilla-pdfjs.component';
import { environment } from '../../../environments/environment';
import * as pdfjsLib from 'pdfjs-dist';

// Mock PDF.js
const mockPdfjsDocument = {
  numPages: 5,
  getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve({
    getViewport: jasmine.createSpy('getViewport').and.returnValue({
      width: 612,
      height: 792,
      scale: 1.5
    }),
    render: jasmine.createSpy('render').and.returnValue({
      promise: Promise.resolve()
    }),
    getTextContent: jasmine.createSpy('getTextContent').and.returnValue(Promise.resolve({
      items: [
        {
          str: 'Sample text',
          transform: [1, 0, 0, 1, 100, 200],
          width: 50,
          height: 12
        }
      ]
    }))
  }))
};

const mockLoadingTask = {
  promise: Promise.resolve(mockPdfjsDocument)
};

// Mock environment
const mockEnvironment = {
  pdfUrlMozilla: 'https://example.com/test.pdf'
};

describe('VanillaPdfjsComponent', () => {
  let component: VanillaPdfjsComponent;
  let fixture: ComponentFixture<VanillaPdfjsComponent>;
  let httpTestingController: HttpTestingController;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(async () => {
    // Mock canvas and context
    mockCanvas = {
      getContext: jasmine.createSpy('getContext').and.returnValue({
        save: jasmine.createSpy('save'),
        restore: jasmine.createSpy('restore'),
        translate: jasmine.createSpy('translate'),
        drawImage: jasmine.createSpy('drawImage'),
        clearRect: jasmine.createSpy('clearRect'),
        scale: jasmine.createSpy('scale'),
        rotate: jasmine.createSpy('rotate')
      }),
      width: 612,
      height: 792,
      getBoundingClientRect: jasmine.createSpy('getBoundingClientRect').and.returnValue({
        left: 0,
        top: 0,
        width: 612,
        height: 792
      })
    } as any;

    mockContext = mockCanvas.getContext('2d') as any;

    // Mock document.createElement for canvas
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      } else if (tagName === 'span') {
        return {
          style: {},
          textContent: ''
        } as any;
      }
      return document.createElement(tagName);
    });

    // Mock PDF.js module
    spyOn(pdfjsLib, 'getDocument').and.returnValue(mockLoadingTask as any);
    
    // Mock GlobalWorkerOptions - use Object.defineProperty to mock the property
    Object.defineProperty(pdfjsLib, 'GlobalWorkerOptions', {
      value: { workerSrc: '' },
      writable: true,
      configurable: true
    });

    await TestBed.configureTestingModule({
      declarations: [VanillaPdfjsComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        { provide: 'environment', useValue: mockEnvironment }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VanillaPdfjsComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);

    // Mock ViewChild elements
    component.pdfCanvas = {
      nativeElement: mockCanvas
    } as ElementRef<HTMLCanvasElement>;

    component.textLayerRef = {
      nativeElement: {
        innerHTML: '',
        style: {},
        parentElement: {
          getBoundingClientRect: jasmine.createSpy('getBoundingClientRect').and.returnValue({
            left: 0,
            top: 0,
            width: 800,
            height: 600
          })
        }
      }
    } as any;

    component.fileInput = {
      nativeElement: {
        value: '',
        files: null
      }
    } as any;

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentPage).toBe(1);
      expect(component.totalPages).toBe(0);
      expect(component.scale).toBe(1.5);
      expect(component.zoom).toBe(1.5);
      expect(component.rotation).toBe(0);
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
      expect(component.showThumbnails).toBe(false);
      expect(component.showToolbar).toBe(true);
      expect(component.continuousScroll).toBe(false);
      expect(component.searchText).toBe('');
      expect(component.searchResults).toEqual([]);
      expect(component.isSearching).toBe(false);
      expect(component.currentSearchIndex).toBe(0);
      expect(component.pdfSource).toBe('url');
      expect(component.pdfFileName).toBeNull();
      expect(component.uploadedPdfData).toBeNull();
    });

    it('should set PDF URL from environment', () => {
      expect(component.pdfUrl).toBe(environment.pdfUrlMozilla);
    });

    it('should initialize PDF.js worker configuration', () => {
      spyOn(component as any, 'initializePdfJs');
      component.ngOnInit();
      expect((component as any).initializePdfJs).toHaveBeenCalled();
    });
  });

  describe('Canvas Initialization', () => {
    it('should initialize canvas and context after view init', fakeAsync(() => {
      spyOn(component as any, 'initializeCanvas');
      spyOn(component as any, 'setupScrollListener');

      component.ngAfterViewInit();
      tick(100);

      expect((component as any).initializeCanvas).toHaveBeenCalled();
      expect((component as any).setupScrollListener).toHaveBeenCalled();
    }));

    it('should set canvas and context when canvas element is available', () => {
      spyOn(component, 'loadPdf');
      (component as any).initializeCanvas();

      expect(component.canvas).toBe(mockCanvas);
      expect(component.context).toBe(mockContext);
      expect(component.loadPdf).toHaveBeenCalled();
    });

    it('should retry initialization if canvas is not ready', fakeAsync(() => {
      component.pdfCanvas = undefined;
      spyOn(component as any, 'initializeCanvas').and.callThrough();

      (component as any).initializeCanvas();
      tick(150);

      expect((component as any).initializeCanvas).toHaveBeenCalledTimes(2);
    }));
  });

  describe('PDF Loading', () => {
    it('should load PDF from URL', fakeAsync(() => {
      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());
      component.pdfSource = 'url';
      component.pdfUrl = 'https://example.com/test.pdf';

      component.loadPdf();
      tick();

      expect(component.isLoading).toBe(true);
      // Note: Full testing would require mocking the HTTP response
    }));

    it('should load PDF from uploaded file', fakeAsync(() => {
      const mockArrayBuffer = new ArrayBuffer(100);
      component.pdfSource = 'file';
      component.uploadedPdfData = mockArrayBuffer;
      component.pdfFileName = 'test.pdf';

      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());

      component.loadPdf();
      tick();

      expect(component.isLoading).toBe(true);
    }));

    it('should handle PDF loading errors', fakeAsync(() => {
      spyOn(pdfjsLib, 'getDocument').and.returnValue({
        promise: Promise.reject(new Error('Loading failed'))
      } as any);

      component.loadPdf();
      tick();

      expect(component.error).toContain('Loading failed');
      expect(component.isLoading).toBe(false);
    }));

    it('should reset state when loading new PDF', async () => {
      component.pagePositions = [{ pageNumber: 1, top: 0, bottom: 100 }];
      component.searchResults = ['result1'];
      component.currentSearchIndex = 1;
      component.showThumbnails = true;

      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());

      await component.loadPdf();

      expect(component.pagePositions).toEqual([]);
      expect(component.searchResults).toEqual([]);
      expect(component.currentSearchIndex).toBe(0);
      expect(component.currentPage).toBe(1);
      expect(component.continuousScroll).toBe(false);
    });
  });

  describe('Navigation Methods', () => {
    beforeEach(() => {
      component.pdfDocument = mockPdfjsDocument;
      component.totalPages = 5;
      component.currentPage = 3;
      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());
    });

    it('should navigate to next page', async () => {
      await component.nextPage();
      expect(component.currentPage).toBe(4);
      expect(component.renderPage).toHaveBeenCalledWith(4);
    });

    it('should not navigate beyond last page', async () => {
      component.currentPage = 5;
      await component.nextPage();
      expect(component.currentPage).toBe(5);
    });

    it('should navigate to previous page', async () => {
      spyOn(component, 'previousPage').and.callThrough();
      component.currentPage = 3;
      await component.previousPage();
      expect(component.currentPage).toBe(2);
    });

    it('should not navigate before first page', async () => {
      component.currentPage = 1;
      spyOn(component, 'previousPage').and.callThrough();
      await component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it('should go to specific page', async () => {
      component.currentPage = 2;
      await component.goToPage();
      expect(component.renderPage).toHaveBeenCalledWith(2);
    });

    it('should validate page number bounds', async () => {
      component.currentPage = 10; // Beyond total pages
      await component.goToPage();
      expect(component.currentPage).toBe(5); // Should clamp to max

      component.currentPage = 0; // Below minimum
      await component.goToPage();
      expect(component.currentPage).toBe(1); // Should clamp to min
    });
  });

  describe('Zoom and Rotation', () => {
    beforeEach(() => {
      component.pdfDocument = mockPdfjsDocument;
      component.totalPages = 5;
      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());
    });

    it('should zoom in', async () => {
      component.zoom = 1.0;
      await component.zoomIn();
      expect(component.zoom).toBe(1.25);
      expect(component.scale).toBe(1.25);
    });

    it('should not zoom in beyond maximum', async () => {
      component.zoom = 3.0;
      await component.zoomIn();
      expect(component.zoom).toBe(3.0);
    });

    it('should zoom out', async () => {
      component.zoom = 1.5;
      await component.zoomOut();
      expect(component.zoom).toBe(1.25);
      expect(component.scale).toBe(1.25);
    });

    it('should not zoom out below minimum', async () => {
      component.zoom = 0.5;
      await component.zoomOut();
      expect(component.zoom).toBe(0.5);
    });

    it('should rotate clockwise', async () => {
      component.rotation = 0;
      await component.rotateClockwise();
      expect(component.rotation).toBe(90);

      await component.rotateClockwise();
      expect(component.rotation).toBe(180);

      await component.rotateClockwise();
      expect(component.rotation).toBe(270);

      await component.rotateClockwise();
      expect(component.rotation).toBe(0); // Should wrap around
    });
  });

  describe('File Upload', () => {
    it('should handle valid PDF file selection', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsArrayBuffer: jasmine.createSpy('readAsArrayBuffer'),
        result: new ArrayBuffer(100)
      };

      spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);
      spyOn(component, 'loadPdf');

      component.onFileSelected(mockEvent);

      expect(component.error).toBeNull();
      expect(component.isLoading).toBe(true);
      expect(component.pdfSource).toBe('file');
      expect(component.pdfFileName).toBe('test.pdf');
      expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);

      // Simulate successful file read
      mockFileReader.onload();
      expect(component.uploadedPdfData).toEqual(jasmine.any(ArrayBuffer));
      expect(component.isLoading).toBe(false);
      expect(component.loadPdf).toHaveBeenCalled();
    });

    it('should handle invalid file type', () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      component.onFileSelected(mockEvent);

      expect(component.error).toBe('Please select a valid PDF file');
      expect(component.isLoading).toBe(false);
    });

    it('should handle file read error', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsArrayBuffer: jasmine.createSpy('readAsArrayBuffer')
      };

      spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

      component.onFileSelected(mockEvent);

      // Simulate file read error
      mockFileReader.onerror();
      expect(component.error).toBe('Failed to read file');
      expect(component.isLoading).toBe(false);
    });

    it('should clear file input and reset to URL source', () => {
      component.pdfSource = 'file';
      component.pdfFileName = 'test.pdf';
      component.uploadedPdfData = new ArrayBuffer(100);

      spyOn(component, 'loadPdf');

      (component as any).clearFile();

      expect(component.pdfSource).toBe('url');
      expect(component.pdfFileName).toBeNull();
      expect(component.uploadedPdfData).toBeNull();
      expect(component.fileInput.nativeElement.value).toBe('');
      expect(component.loadPdf).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      component.pdfDocument = mockPdfjsDocument;
      component.totalPages = 3;
      component.searchText = 'test';
    });

    it('should perform search across all pages', fakeAsync(() => {
      spyOn(component as any, 'searchInPage').and.returnValue(['result1', 'result2']);

      component.performSearch();
      tick();

      expect(component.isSearching).toBe(true);
      // Search should be called for each page
      expect((component as any).searchInPage).toHaveBeenCalledTimes(3);
    }));

    it('should navigate to next search result', () => {
      component.searchResults = ['result1', 'result2', 'result3'];
      component.currentSearchIndex = 0;

      component.nextSearchResult();

      expect(component.currentSearchIndex).toBe(1);
    });

    it('should wrap around to first result when at end', () => {
      component.searchResults = ['result1', 'result2', 'result3'];
      component.currentSearchIndex = 2;

      component.nextSearchResult();

      expect(component.currentSearchIndex).toBe(0);
    });

    it('should navigate to previous search result', () => {
      component.searchResults = ['result1', 'result2', 'result3'];
      component.currentSearchIndex = 2;

      component.previousSearchResult();

      expect(component.currentSearchIndex).toBe(1);
    });

    it('should wrap around to last result when at beginning', () => {
      component.searchResults = ['result1', 'result2', 'result3'];
      component.currentSearchIndex = 0;

      component.previousSearchResult();

      expect(component.currentSearchIndex).toBe(2);
    });

    it('should clear search results', () => {
      component.searchResults = ['result1', 'result2'];
      component.currentSearchIndex = 1;
      component.highlightedResults = ['highlight1'];

      component.clearSearch();

      expect(component.searchText).toBe('');
      expect(component.searchResults).toEqual([]);
      expect(component.currentSearchIndex).toBe(0);
      expect(component.highlightedResults).toEqual([]);
    });
  });

  describe('UI State Management', () => {
    it('should toggle thumbnails', () => {
      component.showThumbnails = false;
      component.toggleThumbnails();
      expect(component.showThumbnails).toBe(true);

      component.toggleThumbnails();
      expect(component.showThumbnails).toBe(false);
    });

    it('should toggle toolbar', () => {
      component.showToolbar = true;
      component.toggleToolbar();
      expect(component.showToolbar).toBe(false);

      component.toggleToolbar();
      expect(component.showToolbar).toBe(true);
    });

    it('should toggle continuous scroll mode', async () => {
      component.continuousScroll = false;
      spyOn(component, 'renderPage').and.returnValue(Promise.resolve());
      spyOn(component, 'renderAllPages').and.returnValue(Promise.resolve());

      await component.toggleContinuousScroll();

      expect(component.continuousScroll).toBe(true);
      expect(component.renderAllPages).toHaveBeenCalled();

      await component.toggleContinuousScroll();

      expect(component.continuousScroll).toBe(false);
      expect(component.renderPage).toHaveBeenCalledWith(component.currentPage);
    });
  });

  describe('Component Lifecycle', () => {
    it('should cancel render task on destroy', () => {
      const mockRenderTask = {
        cancel: jasmine.createSpy('cancel')
      };
      component.renderTask = mockRenderTask;

      component.ngOnDestroy();

      expect(mockRenderTask.cancel).toHaveBeenCalled();
    });

    it('should handle destroy when no render task exists', () => {
      component.renderTask = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', async () => {
      spyOn(console, 'error');
      component.pdfDocument = {
        getPage: jasmine.createSpy('getPage').and.returnValue(
          Promise.reject(new Error('Render error'))
        )
      } as any;

      await component.renderPage(1);

      expect(console.error).toHaveBeenCalled();
      expect(component.error).toContain('Render error');
    });

    it('should handle scroll listener errors', () => {
      spyOn(console, 'error');
      component.pagePositions = []; // Empty positions to trigger error

      (component as any).updateCurrentPageFromScroll();

      // Should not throw error
      expect(() => (component as any).updateCurrentPageFromScroll()).not.toThrow();
    });
  });

  describe('PDF.js Integration', () => {
    it('should configure PDF.js worker on initialization', () => {
      (component as any).initializePdfJs();
      
      // Worker should be configured with the correct path
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.min.mjs');
    });

    it('should handle missing worker configuration', () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      
      (component as any).initializePdfJs();
      
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.min.mjs');
    });
  });
});
