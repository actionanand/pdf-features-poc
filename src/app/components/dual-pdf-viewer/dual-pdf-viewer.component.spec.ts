import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { DualPdfViewerComponent } from './dual-pdf-viewer.component';

describe('DualPdfViewerComponent', () => {
  let component: DualPdfViewerComponent;
  let fixture: ComponentFixture<DualPdfViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DualPdfViewerComponent],
      imports: [FormsModule, RouterTestingModule, PdfViewerModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DualPdfViewerComponent);
    component = fixture.componentInstance;
    
    // Mock the ViewChild elements
    component.leftContainer = {
      nativeElement: {
        querySelector: jasmine.createSpy('querySelector').and.returnValue({
          querySelector: jasmine.createSpy('querySelector').and.returnValue({
            addEventListener: jasmine.createSpy('addEventListener'),
            removeEventListener: jasmine.createSpy('removeEventListener'),
            scrollTop: 0,
            scrollHeight: 1000,
            clientHeight: 500
          })
        })
      }
    } as any;

    component.rightContainer = {
      nativeElement: {
        querySelector: jasmine.createSpy('querySelector').and.returnValue({
          querySelector: jasmine.createSpy('querySelector').and.returnValue({
            addEventListener: jasmine.createSpy('addEventListener'),
            removeEventListener: jasmine.createSpy('removeEventListener'),
            scrollTop: 0,
            scrollHeight: 1000,
            clientHeight: 500
          })
        })
      }
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.leftPdfSrc).toBeNull();
    expect(component.rightPdfSrc).toBeNull();
    expect(component.leftCurrentPage).toBe(1);
    expect(component.rightCurrentPage).toBe(1);
    expect(component.isLinked).toBe(false);
    expect(component.leftZoom).toBe(1.0);
    expect(component.rightZoom).toBe(1.0);
  });

  it('should handle left file selection with valid PDF', () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockEvent = { target: { files: [mockFile] } };
    const mockFileReader = {
      onload: null as any,
      onerror: null as any,
      readAsArrayBuffer: jasmine.createSpy('readAsArrayBuffer'),
      result: new ArrayBuffer(8)
    };

    spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

    component.onLeftFileSelected(mockEvent);

    expect(component.leftError).toBeNull();
    expect(component.leftLoading).toBe(true);
    expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);

    // Simulate successful file read
    mockFileReader.onload();
    expect(component.leftPdfSrc).toEqual(jasmine.any(Uint8Array));
    expect(component.leftLoading).toBe(false);
  });

  it('should handle invalid file selection', () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const mockEvent = { target: { files: [mockFile] } };

    component.onLeftFileSelected(mockEvent);

    expect(component.leftError).toBe('Please select a valid PDF file');
  });

  it('should load PDF from URL', () => {
    component.leftPdfUrl = 'https://example.com/test.pdf';
    
    component.loadLeftPdfFromUrl();
    
    expect(component.leftError).toBeNull();
    expect(component.leftLoading).toBe(true);
    expect(component.leftPdfSrc).toBe('https://example.com/test.pdf');
  });

  it('should handle PDF loaded event', fakeAsync(() => {
    const mockEvent = { numPages: 10 };
    spyOn(window, 'clearTimeout');
    spyOn(component as any, 'setupLeftPageTracking');

    component.onLeftPdfLoaded(mockEvent);

    expect(component.leftLoading).toBe(false);
    expect(component.leftTotalPages).toBe(10);
    expect(component.leftCurrentPage).toBe(1);
    expect(component.leftError).toBeNull();

    tick(500);
    expect((component as any).setupLeftPageTracking).toHaveBeenCalled();
  }));

  it('should handle page change', () => {
    spyOn(component as any, 'syncPageToRight');
    component.isLinked = true;
    (component as any).scrollSyncActive = false;

    component.onLeftPageChange(5);

    expect(component.leftCurrentPage).toBe(5);
    expect((component as any).syncPageToRight).toHaveBeenCalledWith(5);
  });

  it('should toggle link state', () => {
    spyOn(component as any, 'setupScrollSync');
    spyOn(component as any, 'removeScrollListeners');
    component.isLinked = false;

    component.toggleLink();

    expect(component.isLinked).toBe(true);
    expect((component as any).setupScrollSync).toHaveBeenCalled();

    component.toggleLink();

    expect(component.isLinked).toBe(false);
    expect((component as any).removeScrollListeners).toHaveBeenCalled();
  });

  it('should clear PDF data', () => {
    component.leftPdfSrc = 'test-src';
    component.leftPdfUrl = 'test-url';
    component.leftError = 'test-error';

    component.clearLeftPdf();

    expect(component.leftPdfSrc).toBeNull();
    expect(component.leftPdfUrl).toBe('');
    expect(component.leftError).toBeNull();
  });

  it('should handle zoom operations', () => {
    component.leftZoom = 1.0;
    
    component.zoomIn('left');
    expect(component.leftZoom).toBe(1.1);
    
    component.zoomOut('left');
    expect(component.leftZoom).toBe(1.0);
    
    component.leftZoom = 1.5;
    component.resetZoom('left');
    expect(component.leftZoom).toBe(1.0);
  });

  it('should clean up on destroy', () => {
    spyOn(component as any, 'removeScrollListeners');
    spyOn(component as any, 'removePageTrackers');
    spyOn(window, 'clearTimeout');

    (component as any).leftLoadTimeout = 123;
    (component as any).rightLoadTimeout = 456;

    component.ngOnDestroy();

    expect((component as any).removeScrollListeners).toHaveBeenCalled();
    expect((component as any).removePageTrackers).toHaveBeenCalled();
    expect(window.clearTimeout).toHaveBeenCalledWith(123);
    expect(window.clearTimeout).toHaveBeenCalledWith(456);
  });
});