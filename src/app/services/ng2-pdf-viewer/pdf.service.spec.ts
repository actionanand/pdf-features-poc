import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PdfService, PdfLoadResult } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PdfService]
    });
    service = TestBed.inject(PdfService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('loadPdfFromUrl', () => {
    it('should load PDF successfully from URL', async () => {
      const testUrl = 'https://example.com/test.pdf';
      const mockData = new ArrayBuffer(100);
      const mockBlob = new Blob([mockData], { type: 'application/pdf' });
      
      // Mock Blob.arrayBuffer method
      spyOn(mockBlob, 'arrayBuffer').and.returnValue(Promise.resolve(mockData));

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob);

      const result: PdfLoadResult = await loadPromise;

      expect(result).toBeDefined();
      expect(result.pdfSrc).toBeInstanceOf(Uint8Array);
      expect(result.originalData).toBe(mockData);
      expect(result.pdfSrc.length).toBe(100);
    });

    it('should throw error when HTTP request fails', async () => {
      const testUrl = 'https://example.com/nonexistent.pdf';

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('Network error'));

      await expectAsync(loadPromise).toBeRejected();
    });

    it('should throw error when response is null', async () => {
      const testUrl = 'https://example.com/test.pdf';

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.flush(null);

      await expectAsync(loadPromise).toBeRejectedWithError('Failed to load PDF');
    });

    it('should handle arrayBuffer conversion errors', async () => {
      const testUrl = 'https://example.com/test.pdf';
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      
      // Mock arrayBuffer to throw error
      spyOn(mockBlob, 'arrayBuffer').and.returnValue(Promise.reject(new Error('ArrayBuffer conversion failed')));

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.flush(mockBlob);

      await expectAsync(loadPromise).toBeRejectedWithError('ArrayBuffer conversion failed');
    });
  });

  describe('checkForOutline', () => {
    let mockPdfDocument: jasmine.SpyObj<any>;

    beforeEach(() => {
      mockPdfDocument = jasmine.createSpyObj('pdfDocument', ['getOutline']);
    });

    it('should return true when PDF has outline', async () => {
      const mockOutline = [
        { title: 'Chapter 1', dest: null },
        { title: 'Chapter 2', dest: null }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutline));

      const result = await service.checkForOutline(mockPdfDocument);

      expect(result).toBe(true);
      expect(mockPdfDocument.getOutline).toHaveBeenCalled();
    });

    it('should return false when PDF has empty outline', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));

      const result = await service.checkForOutline(mockPdfDocument);

      expect(result).toBe(false);
      expect(mockPdfDocument.getOutline).toHaveBeenCalled();
    });

    it('should return false when PDF has null outline', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(null));

      const result = await service.checkForOutline(mockPdfDocument);

      expect(result).toBe(false);
      expect(mockPdfDocument.getOutline).toHaveBeenCalled();
    });

    it('should return false when pdfDocument is null', async () => {
      const result = await service.checkForOutline(null);

      expect(result).toBe(false);
    });

    it('should return false when pdfDocument is undefined', async () => {
      const result = await service.checkForOutline(undefined);

      expect(result).toBe(false);
    });

    it('should handle getOutline error gracefully', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.reject(new Error('Outline access error')));
      spyOn(console, 'warn');

      const result = await service.checkForOutline(mockPdfDocument);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Error checking for outline:', jasmine.any(Error));
    });

    it('should log outline information when outline exists', async () => {
      const mockOutline = [
        { title: 'Chapter 1' },
        { title: 'Chapter 2' },
        { title: 'Chapter 3' }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutline));
      spyOn(console, 'log');

      await service.checkForOutline(mockPdfDocument);

      expect(console.log).toHaveBeenCalledWith('PDF has outline with', 3, 'items');
    });
  });

  describe('checkForAttachments', () => {
    let mockPdfDocument: jasmine.SpyObj<any>;

    beforeEach(() => {
      mockPdfDocument = jasmine.createSpyObj('pdfDocument', ['getAttachments']);
    });

    it('should return true when PDF has attachments', async () => {
      const mockAttachments = {
        'file1.txt': { content: new Uint8Array([1, 2, 3]) },
        'file2.pdf': { content: new Uint8Array([4, 5, 6]) }
      };
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(mockAttachments));

      const result = await service.checkForAttachments(mockPdfDocument);

      expect(result).toBe(true);
      expect(mockPdfDocument.getAttachments).toHaveBeenCalled();
    });

    it('should return false when PDF has empty attachments object', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve({}));

      const result = await service.checkForAttachments(mockPdfDocument);

      expect(result).toBe(false);
      expect(mockPdfDocument.getAttachments).toHaveBeenCalled();
    });

    it('should return false when PDF has null attachments', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(null));

      const result = await service.checkForAttachments(mockPdfDocument);

      expect(result).toBe(false);
      expect(mockPdfDocument.getAttachments).toHaveBeenCalled();
    });

    it('should return false when pdfDocument is null', async () => {
      const result = await service.checkForAttachments(null);

      expect(result).toBe(false);
    });

    it('should return false when pdfDocument is undefined', async () => {
      const result = await service.checkForAttachments(undefined);

      expect(result).toBe(false);
    });

    it('should handle getAttachments error gracefully', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.reject(new Error('Attachments access error')));
      spyOn(console, 'warn');

      const result = await service.checkForAttachments(mockPdfDocument);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Error checking for attachments:', jasmine.any(Error));
    });

    it('should log attachment names when attachments exist', async () => {
      const mockAttachments = {
        'document.txt': { content: new Uint8Array() },
        'image.png': { content: new Uint8Array() }
      };
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(mockAttachments));
      spyOn(console, 'log');

      await service.checkForAttachments(mockPdfDocument);

      expect(console.log).toHaveBeenCalledWith('PDF has attachments:', ['document.txt', 'image.png']);
    });
  });

  describe('getFileName', () => {
    it('should extract filename from valid URL', () => {
      const url = 'https://example.com/documents/test.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('test.pdf');
    });

    it('should extract filename from URL with query parameters', () => {
      const url = 'https://example.com/files/document.pdf?version=1&type=pdf';
      const result = service.getFileName(url);
      expect(result).toBe('document.pdf');
    });

    it('should extract filename from URL with hash', () => {
      const url = 'https://example.com/pdfs/report.pdf#page=1';
      const result = service.getFileName(url);
      expect(result).toBe('report.pdf');
    });

    it('should handle URL with nested paths', () => {
      const url = 'https://example.com/folder/subfolder/nested/file.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('file.pdf');
    });

    it('should return default filename for URL without .pdf extension', () => {
      const url = 'https://example.com/documents/test.txt';
      const result = service.getFileName(url);
      expect(result).toBe('document.pdf');
    });

    it('should return default filename for URL without filename', () => {
      const url = 'https://example.com/documents/';
      const result = service.getFileName(url);
      expect(result).toBe('document.pdf');
    });

    it('should return default filename for root URL', () => {
      const url = 'https://example.com/';
      const result = service.getFileName(url);
      expect(result).toBe('document.pdf');
    });

    it('should handle invalid URL gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      spyOn(console, 'warn');
      
      const result = service.getFileName(invalidUrl);
      
      expect(result).toBe('document.pdf');
      expect(console.warn).toHaveBeenCalledWith('Error extracting filename from URL:', jasmine.any(Error));
    });

    it('should handle empty string URL', () => {
      const result = service.getFileName('');
      expect(result).toBe('document.pdf');
    });

    it('should handle URL with encoded characters', () => {
      const url = 'https://example.com/files/my%20document.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('my%20document.pdf');
    });

    it('should handle URLs with port numbers', () => {
      const url = 'https://example.com:8080/files/test.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('test.pdf');
    });

    it('should handle localhost URLs', () => {
      const url = 'http://localhost:3000/assets/sample.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('sample.pdf');
    });

    it('should handle file protocol URLs', () => {
      const url = 'file:///C:/Users/Documents/local.pdf';
      const result = service.getFileName(url);
      expect(result).toBe('local.pdf');
    });

    it('should handle URLs ending with .PDF (uppercase)', () => {
      const url = 'https://example.com/documents/TEST.PDF';
      const result = service.getFileName(url);
      expect(result).toBe('document.pdf'); // Should return default because it's looking for lowercase .pdf
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle HTTP timeout gracefully', async () => {
      const testUrl = 'https://example.com/slow.pdf';

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('timeout'), { 
        status: 0, 
        statusText: 'Timeout' 
      });

      await expectAsync(loadPromise).toBeRejected();
    });

    it('should handle 404 error gracefully', async () => {
      const testUrl = 'https://example.com/notfound.pdf';

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('error'), { 
        status: 404, 
        statusText: 'Not Found' 
      });

      await expectAsync(loadPromise).toBeRejected();
    });

    it('should handle large PDF files', async () => {
      const testUrl = 'https://example.com/large.pdf';
      const largeData = new ArrayBuffer(10 * 1024 * 1024); // 10MB
      const mockBlob = new Blob([largeData], { type: 'application/pdf' });
      
      spyOn(mockBlob, 'arrayBuffer').and.returnValue(Promise.resolve(largeData));

      const loadPromise = service.loadPdfFromUrl(testUrl);

      const req = httpMock.expectOne(testUrl);
      req.flush(mockBlob);

      const result = await loadPromise;

      expect(result.pdfSrc.length).toBe(10 * 1024 * 1024);
      expect(result.originalData.byteLength).toBe(10 * 1024 * 1024);
    });
  });

  describe('Console Logging', () => {
    it('should log PDF loading start', async () => {
      const testUrl = 'https://example.com/test.pdf';
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      
      spyOn(mockBlob, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(4)));
      spyOn(console, 'log');

      const loadPromise = service.loadPdfFromUrl(testUrl);

      expect(console.log).toHaveBeenCalledWith('Loading PDF as blob from:', testUrl);

      const req = httpMock.expectOne(testUrl);
      req.flush(mockBlob);

      await loadPromise;

      expect(console.log).toHaveBeenCalledWith('PDF loaded successfully as blob');
    });
  });
});
