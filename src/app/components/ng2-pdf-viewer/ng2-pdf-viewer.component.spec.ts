import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule, PdfViewerComponent } from 'ng2-pdf-viewer';

import { Ng2PdfViewerComponent } from './ng2-pdf-viewer.component';
import { AttachmentService, AttachmentInfo } from '../../services/ng2-pdf-viewer/attachment.service';
import { PdfService } from '../../services/ng2-pdf-viewer/pdf.service';
import { SearchService, SearchState } from '../../services/ng2-pdf-viewer/search.service';
import { SidebarService, SidebarState } from '../../services/ng2-pdf-viewer/sidebar.service';
import { ThumbnailService, ThumbnailData } from '../../services/ng2-pdf-viewer/thumbnail.service';
import { OutlineService, OutlineItem } from '../../services/ng2-pdf-viewer/outline.service';
import { environment } from '../../../environments/environment';

describe('Ng2PdfViewerComponent', () => {
  let component: Ng2PdfViewerComponent;
  let fixture: ComponentFixture<Ng2PdfViewerComponent>;
  let mockAttachmentService: jasmine.SpyObj<AttachmentService>;
  let mockPdfService: jasmine.SpyObj<PdfService>;
  let mockSearchService: jasmine.SpyObj<SearchService>;
  let mockSidebarService: jasmine.SpyObj<SidebarService>;
  let mockThumbnailService: jasmine.SpyObj<ThumbnailService>;
  let mockOutlineService: jasmine.SpyObj<OutlineService>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  // Mock data
  const mockSearchState: SearchState = {
    searchText: '',
    hasSearchResults: false,
    searchResultsInfo: '',
    currentSearchMatchIndex: 0,
    totalSearchMatches: 0
  };

  const mockSidebarState: SidebarState = {
    currentMode: null,
    isVisible: false
  };

  const mockThumbnails: ThumbnailData[] = [
    { pageNumber: 1, dataUrl: 'data:image/png;base64,test1' },
    { pageNumber: 2, dataUrl: 'data:image/png;base64,test2' }
  ];

  const mockOutline: OutlineItem[] = [
    { title: 'Chapter 1', dest: 'page1', items: [] },
    { title: 'Chapter 2', dest: 'page2', items: [] }
  ];

  const mockAttachments: AttachmentInfo[] = [
    { filename: 'attachment1.pdf', originalFilename: 'attachment1.pdf', description: 'Test attachment', size: 1024, content: new Uint8Array() }
  ];

  beforeEach(async () => {
    // Create spies for all services
    mockAttachmentService = jasmine.createSpyObj('AttachmentService', [
      'generateAttachments', 'downloadAttachment'
    ]);
    
    mockPdfService = jasmine.createSpyObj('PdfService', [
      'loadFromUrl', 'loadFromUint8Array'
    ]);
    
    mockSearchService = jasmine.createSpyObj('SearchService', [
      'clearSearch', 'updateSearchText', 'performSearch', 'findNext', 'findPrevious',
      'clearSearchHighlights', 'updateSearchResults'
    ]);
    
    mockSidebarService = jasmine.createSpyObj('SidebarService', [
      'toggleSidebar', 'hideSidebar'
    ]);
    
    mockThumbnailService = jasmine.createSpyObj('ThumbnailService', [
      'generateThumbnails'
    ]);
    
    mockOutlineService = jasmine.createSpyObj('OutlineService', [
      'processOutline', 'navigateToDestination'
    ]);

    mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', [
      'detectChanges', 'markForCheck'
    ]);

    // Setup service return values
    mockSearchService.clearSearch.and.returnValue(mockSearchState);
    mockSidebarService.hideSidebar.and.returnValue(mockSidebarState);
    mockSidebarService.toggleSidebar.and.returnValue(mockSidebarState);
    mockThumbnailService.generateThumbnails.and.returnValue(Promise.resolve(mockThumbnails));
    mockOutlineService.processOutline.and.returnValue(Promise.resolve(mockOutline));
    mockAttachmentService.generateAttachments.and.returnValue(Promise.resolve(mockAttachments));

    await TestBed.configureTestingModule({
      declarations: [Ng2PdfViewerComponent],
      imports: [FormsModule, PdfViewerModule],
      providers: [
        { provide: AttachmentService, useValue: mockAttachmentService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: SidebarService, useValue: mockSidebarService },
        { provide: ThumbnailService, useValue: mockThumbnailService },
        { provide: OutlineService, useValue: mockOutlineService },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Ng2PdfViewerComponent);
    component = fixture.componentInstance;

    // Mock the ViewChild PdfViewerComponent
    component['pdfComponent'] = {
      eventBus: {
        on: jasmine.createSpy('on'),
        off: jasmine.createSpy('off')
      },
      pdfViewer: {
        currentPageNumber: 1,
        pagesCount: 10
      }
    } as any;

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.pdfSrc).toBeNull();
      expect(component.currentPage).toBe(1);
      expect(component.totalPages).toBe(0);
      expect(component.zoom).toBe(1.0);
      expect(component.fitToPage).toBe(true);
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
      expect(component.showSinglePage).toBe(false);
      expect(component.showToolbar).toBe(true);
      expect(component.isPasswordProtected).toBe(false);
      expect(component.showPasswordDialog).toBe(false);
      expect(component.password).toBe('');
      expect(component.passwordError).toBe('');
    });

    it('should initialize service states', () => {
      expect(component.searchState).toEqual(jasmine.objectContaining(mockSearchState));
      expect(component.sidebarState).toEqual(jasmine.objectContaining(mockSidebarState));
      expect(component.thumbnails).toEqual([]);
      expect(component.outline).toEqual([]);
      expect(component.attachments).toEqual([]);
    });

    it('should set PDF URL from environment', () => {
      expect(component.pdfUrl).toBe(environment.pdfUrlDefault);
    });

    it('should call loadPdf on init', () => {
      spyOn(component, 'loadPdf');
      component.ngOnInit();
      expect(component.loadPdf).toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup on destroy', () => {
      // Setup some handlers to test cleanup
      component['searchMatchesHandler'] = jasmine.createSpy('searchMatchesHandler');
      component['pageChangingHandler'] = jasmine.createSpy('pageChangingHandler');
      component['searchTimeout'] = 123 as any;

      spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      expect(window.clearTimeout).toHaveBeenCalledWith(123);
    });
  });

  describe('Search Functionality', () => {
    it('should update search text', () => {
      component.searchText = 'test search';
      expect(component.searchState.searchText).toBe('test search');
      expect(mockSearchService.updateSearchText).toHaveBeenCalledWith('test search');
    });

    it('should perform search when text is entered', () => {
      component.searchState.searchText = 'test';
      spyOn(component, 'search');

      component.performSearch();

      expect(mockSearchService.updateSearchText).toHaveBeenCalledWith('test');
      expect(component.search).toHaveBeenCalledWith('test');
    });

    it('should clear search', () => {
      component.clearSearch();

      expect(mockSearchService.clearSearch).toHaveBeenCalled();
      expect(mockSearchService.clearSearchHighlights).toHaveBeenCalledWith(component['pdfComponent']);
      expect(component.searchState).toEqual(mockSearchState);
    });

    it('should find next search result', () => {
      component.searchState.hasSearchResults = true;

      component.findNext();

      expect(component['pdfComponent'].eventBus.on).toHaveBeenCalled();
      expect(mockSearchService.findNext).toHaveBeenCalledWith(component['pdfComponent']);
    });

    it('should find previous search result', () => {
      component.searchState.hasSearchResults = true;

      component.findPrevious();

      expect(component['pdfComponent'].eventBus.on).toHaveBeenCalled();
      expect(mockSearchService.findPrevious).toHaveBeenCalledWith(component['pdfComponent']);
    });

    it('should not find next/previous when no search results', () => {
      component.searchState.hasSearchResults = false;

      component.findNext();
      component.findPrevious();

      expect(mockSearchService.findNext).not.toHaveBeenCalled();
      expect(mockSearchService.findPrevious).not.toHaveBeenCalled();
    });
  });

  describe('File Upload', () => {
    let mockFile: File;
    let mockEvent: Event;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      mockEvent = {
        target: {
          files: [mockFile],
          value: ''
        }
      } as any;
    });

    it('should handle valid PDF file upload', fakeAsync(() => {
      const mockArrayBuffer = new ArrayBuffer(100);
      spyOn(component as any, 'readFileAsArrayBuffer').and.returnValue(Promise.resolve(mockArrayBuffer));
      spyOn(component as any, 'resetPdfStates');

      component.onFileSelected(mockEvent);
      tick();

      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
      expect(component.pdfSrc).toEqual(jasmine.any(Uint8Array));
      expect((component as any).resetPdfStates).toHaveBeenCalled();
    }));

    it('should reject invalid file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const invalidEvent = {
        target: { files: [invalidFile] }
      } as any;

      await component.onFileSelected(invalidEvent);

      expect(component.error).toBe('Please select a valid PDF file.');
    });

    it('should reject oversized files', async () => {
      const largeFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 }); // 60MB

      const largeEvent = {
        target: { files: [largeFile] }
      } as any;

      await component.onFileSelected(largeEvent);

      expect(component.error).toBe('File size too large. Please select a PDF file smaller than 50MB.');
    });

    it('should handle file reading errors', fakeAsync(() => {
      spyOn(component as any, 'readFileAsArrayBuffer').and.returnValue(Promise.reject(new Error('Read failed')));

      component.onFileSelected(mockEvent);
      tick();

      expect(component.error).toBe('Failed to load the uploaded PDF file. Please try again.');
      expect(component.isLoading).toBe(false);
    }));

    it('should return early if no file selected', async () => {
      const emptyEvent = {
        target: { files: null }
      } as any;

      spyOn(component as any, 'readFileAsArrayBuffer');

      await component.onFileSelected(emptyEvent);

      expect((component as any).readFileAsArrayBuffer).not.toHaveBeenCalled();
    });
  });

  describe('PDF Navigation', () => {
    beforeEach(() => {
      component.totalPages = 10;
      component.currentPage = 5;
    });

    it('should navigate to next page', () => {
      component.nextPage();
      expect(component.currentPage).toBe(6);
    });

    it('should not navigate beyond last page', () => {
      component.currentPage = 10;
      component.nextPage();
      expect(component.currentPage).toBe(10);
    });

    it('should navigate to previous page', () => {
      component.previousPage();
      expect(component.currentPage).toBe(4);
    });

    it('should not navigate before first page', () => {
      component.currentPage = 1;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it('should go to specific page', () => {
      component.currentPage = 7;
      component.goToPage();

      expect(component['pdfComponent'].pdfViewer.currentPageNumber).toBe(7);
    });

    it('should clamp page numbers to valid range', () => {
      component.currentPage = 15; // Beyond max
      component.goToPage();
      expect(component.currentPage).toBe(10);

      component.currentPage = -1; // Below min
      component.goToPage();
      expect(component.currentPage).toBe(1);
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in', () => {
      component.zoom = 1.0;
      component.zoomIn();
      expect(component.zoom).toBe(1.25);
    });

    it('should not zoom in beyond maximum', () => {
      component.zoom = 3.0;
      component.zoomIn();
      expect(component.zoom).toBe(3.0);
    });

    it('should zoom out', () => {
      component.zoom = 1.0;
      component.zoomOut();
      expect(component.zoom).toBe(0.75);
    });

    it('should not zoom out below minimum', () => {
      component.zoom = 0.25;
      component.zoomOut();
      expect(component.zoom).toBe(0.25);
    });

    it('should toggle fit to page', () => {
      component.fitToPage = false;
      component.zoom = 1.5;

      component.toggleFitToPage();

      expect(component.fitToPage).toBe(true);
      expect(component.zoom).toBe(1.0);
    });
  });

  describe('Page Mode Toggle', () => {
    it('should toggle between single page and continuous scroll', () => {
      component.showSinglePage = false;

      component.togglePageMode();
      expect(component.showSinglePage).toBe(true);

      component.togglePageMode();
      expect(component.showSinglePage).toBe(false);
    });
  });

  describe('Sidebar Management', () => {
    it('should toggle thumbnails sidebar', () => {
      component.toggleThumbnails();
      expect(mockSidebarService.toggleSidebar).toHaveBeenCalledWith('thumbnails');
    });

    it('should toggle index sidebar and generate outline if needed', fakeAsync(() => {
      component.outline = [];
      component.sidebarState = { currentMode: 'index', isVisible: true };
      spyOn(component, 'generateOutline').and.returnValue(Promise.resolve());

      component.toggleIndex();
      tick();

      expect(mockSidebarService.toggleSidebar).toHaveBeenCalledWith('index');
      expect(component.generateOutline).toHaveBeenCalled();
    }));

    it('should toggle attachments sidebar and generate attachments if needed', fakeAsync(() => {
      component.attachments = [];
      component.sidebarState = { currentMode: 'attachments', isVisible: true };
      spyOn(component, 'generateAttachments').and.returnValue(Promise.resolve());

      component.toggleAttachments();
      tick();

      expect(mockSidebarService.toggleSidebar).toHaveBeenCalledWith('attachments');
      expect(component.generateAttachments).toHaveBeenCalled();
    }));

    it('should toggle toolbar', () => {
      component.showToolbar = true;
      component.toggleToolbar();
      expect(component.showToolbar).toBe(false);

      component.toggleToolbar();
      expect(component.showToolbar).toBe(true);
    });
  });

  describe('Password Protection', () => {
    it('should handle password submission', fakeAsync(() => {
      component.password = 'testpass';
      component.pendingPdfData = new Uint8Array([1, 2, 3]);
      spyOn(component, 'loadPdf');

      component.submitPassword();
      tick();

      expect(component.pdfSrc).toEqual({
        data: jasmine.any(Uint8Array),
        password: 'testpass'
      });
      expect(component.showPasswordDialog).toBe(false);
      expect(component.password).toBe('');
      expect(component.passwordSubmitted).toBe(true);
      expect(component.loadPdf).toHaveBeenCalled();
    }));

    it('should cancel password dialog', () => {
      component.showPasswordDialog = true;
      component.password = 'test';
      component.passwordError = 'error';

      component.cancelPasswordDialog();

      expect(component.showPasswordDialog).toBe(false);
      expect(component.password).toBe('');
      expect(component.passwordError).toBe('');
      expect(component.isPasswordProtected).toBe(false);
      expect(component.pendingPdfData).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle password required error', () => {
      const passwordError = { name: 'PasswordException' };

      component.onError(passwordError);

      expect(component.isPasswordProtected).toBe(true);
      expect(component.showPasswordDialog).toBe(true);
      expect(component.passwordError).toBe('');
      expect(component.error).toBeNull();
    });

    it('should handle incorrect password error', () => {
      const incorrectPasswordError = { name: 'IncorrectPasswordException' };
      component.passwordSubmitted = true;

      component.onError(incorrectPasswordError);

      expect(component.passwordError).toBe('Incorrect password. Please try again.');
      expect(component.password).toBe('');
    });

    it('should handle general errors', () => {
      const generalError = { message: 'General error' };

      component.onError(generalError);

      expect(component.error).toBe('Error displaying PDF: General error');
      expect(component.isPasswordProtected).toBe(false);
      expect(component.showPasswordDialog).toBe(false);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('PDF Loading', () => {
    it('should load PDF from URL', fakeAsync(() => {
      spyOn(component as any, 'resetPdfStates');

      component.loadPdf();
      tick();

      expect(component.isLoading).toBe(true);
      expect(component.error).toBeNull();
      expect(component.pdfSrc).toBe(environment.pdfUrlDefault);
      expect((component as any).resetPdfStates).toHaveBeenCalled();
    }));
  });

  describe('Computed Properties', () => {
    it('should compute search properties correctly', () => {
      component.searchState.searchText = 'test';
      component.searchState.hasSearchResults = true;
      component.searchState.searchResultsInfo = '1 of 5';

      expect(component.searchText).toBe('test');
      expect(component.hasSearchResults).toBe(true);
      expect(component.searchResultsInfo).toBe('1 of 5');
    });

    it('should compute sidebar visibility properties', () => {
      component.sidebarState = { currentMode: 'thumbnails', isVisible: true };
      expect(component.showThumbnails).toBe(true);
      expect(component.showIndex).toBe(false);
      expect(component.showAttachments).toBe(false);

      component.sidebarState = { currentMode: 'index', isVisible: true };
      expect(component.showThumbnails).toBe(false);
      expect(component.showIndex).toBe(true);
      expect(component.showAttachments).toBe(false);
    });

    it('should compute content availability properties', () => {
      component.outline = mockOutline;
      component.attachments = mockAttachments;

      expect(component.hasOutline).toBe(true);
      expect(component.hasAttachments).toBe(true);

      component.outline = [];
      component.attachments = [];

      expect(component.hasOutline).toBe(false);
      expect(component.hasAttachments).toBe(false);
    });
  });

  describe('State Reset', () => {
    it('should reset PDF states correctly', () => {
      // Set some non-default values
      component.currentPage = 5;
      component.thumbnails = mockThumbnails;
      component.outline = mockOutline;
      component.attachments = mockAttachments;
      component.searchState.searchText = 'test';

      (component as any).resetPdfStates();

      expect(component.currentPage).toBe(1);
      expect(component.thumbnails).toEqual([]);
      expect(component.outline).toEqual([]);
      expect(component.attachments).toEqual([]);
      expect(mockSidebarService.hideSidebar).toHaveBeenCalled();
      expect(mockSearchService.clearSearch).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should read file as ArrayBuffer', fakeAsync(() => {
      const mockFile = new File(['test'], 'test.pdf');
      const mockArrayBuffer = new ArrayBuffer(100);

      // Mock FileReader
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsArrayBuffer: jasmine.createSpy('readAsArrayBuffer'),
        result: mockArrayBuffer
      };

      spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

      let result: ArrayBuffer | undefined;
      (component as any).readFileAsArrayBuffer(mockFile).then((data: ArrayBuffer) => {
        result = data;
      });

      // Simulate successful file read
      mockFileReader.onload();
      tick();

      expect(result).toBe(mockArrayBuffer);
      expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
    }));

    it('should handle file read errors', fakeAsync(() => {
      const mockFile = new File(['test'], 'test.pdf');

      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsArrayBuffer: jasmine.createSpy('readAsArrayBuffer')
      };

      spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

      let error: Error | undefined;
      (component as any).readFileAsArrayBuffer(mockFile).catch((err: Error) => {
        error = err;
      });

      // Simulate file read error
      mockFileReader.onerror();
      tick();

      expect(error?.message).toBe('Failed to read file');
    }));
  });
});
