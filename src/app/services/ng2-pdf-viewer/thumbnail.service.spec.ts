import { TestBed } from '@angular/core/testing';
import { ThumbnailService, ThumbnailData } from './thumbnail.service';

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  let mockPdfDocument: jasmine.SpyObj<any>;
  let mockPage: jasmine.SpyObj<any>;
  let mockCanvas: jasmine.SpyObj<HTMLCanvasElement>;
  let mockContext: jasmine.SpyObj<CanvasRenderingContext2D>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThumbnailService]
    });
    service = TestBed.inject(ThumbnailService);

    // Setup mock objects
    mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', ['drawImage']);
    
    mockCanvas = jasmine.createSpyObj('HTMLCanvasElement', ['getContext', 'toDataURL'], {
      width: 0,
      height: 0
    });
    mockCanvas.getContext.and.returnValue(mockContext);
    mockCanvas.toDataURL.and.returnValue('data:image/png;base64,mockThumbnailData');

    mockPage = jasmine.createSpyObj('page', ['getViewport', 'render']);
    mockPage.getViewport.and.returnValue({
      width: 200,
      height: 300,
      scale: 0.2
    });
    mockPage.render.and.returnValue({
      promise: Promise.resolve()
    });

    mockPdfDocument = jasmine.createSpyObj('pdfDocument', ['getPage']);
    mockPdfDocument.getPage.and.returnValue(Promise.resolve(mockPage));

    // Mock document.createElement to return our mock canvas
    spyOn(document, 'createElement').and.returnValue(mockCanvas);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty thumbnail cache', () => {
      expect(service.getThumbnails()).toEqual([]);
    });
  });

  describe('getThumbnails', () => {
    it('should return empty array initially', () => {
      const thumbnails = service.getThumbnails();
      expect(thumbnails).toEqual([]);
    });

    it('should return copy of thumbnail cache', () => {
      // Add some test data to internal cache
      const testThumbnail: ThumbnailData = {
        pageNumber: 1,
        dataUrl: 'data:image/png;base64,test'
      };
      
      // Access private property for testing
      (service as any).thumbnailCache.push(testThumbnail);

      const thumbnails = service.getThumbnails();
      expect(thumbnails).toEqual([testThumbnail]);
      
      // Verify it's a copy, not reference
      thumbnails.push({ pageNumber: 2, dataUrl: 'test2' });
      expect(service.getThumbnails().length).toBe(1);
    });
  });

  describe('clearThumbnails', () => {
    it('should clear thumbnail cache', () => {
      // Add test data
      (service as any).thumbnailCache.push({
        pageNumber: 1,
        dataUrl: 'test'
      });

      service.clearThumbnails();

      expect(service.getThumbnails()).toEqual([]);
    });
  });

  describe('generateThumbnails', () => {
    it('should generate thumbnails for all pages', async () => {
      const pageCount = 3;

      const thumbnails = await service.generateThumbnails(mockPdfDocument, pageCount);

      expect(thumbnails.length).toBe(3);
      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(3);
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(1);
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(2);
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(3);

      thumbnails.forEach((thumbnail, index) => {
        expect(thumbnail.pageNumber).toBe(index + 1);
        expect(thumbnail.dataUrl).toBe('data:image/png;base64,mockThumbnailData');
      });
    });

    it('should clear existing thumbnails before generating new ones', async () => {
      // Add existing thumbnail
      (service as any).thumbnailCache.push({
        pageNumber: 99,
        dataUrl: 'existing'
      });

      const thumbnails = await service.generateThumbnails(mockPdfDocument, 2);

      expect(thumbnails.length).toBe(2);
      expect(service.getThumbnails().length).toBe(2);
      expect(service.getThumbnails().find(t => t.pageNumber === 99)).toBeUndefined();
    });

    it('should handle errors gracefully and continue processing', async () => {
      spyOn(console, 'error');
      
      // Make the second page fail
      mockPdfDocument.getPage.and.callFake((pageNum: number) => {
        if (pageNum === 2) {
          return Promise.reject(new Error('Page 2 failed'));
        }
        return Promise.resolve(mockPage);
      });

      const thumbnails = await service.generateThumbnails(mockPdfDocument, 3);

      expect(thumbnails.length).toBe(2); // Only pages 1 and 3 succeed
      expect(console.error).toHaveBeenCalledWith('Error generating thumbnail for page 2:', jasmine.any(Error));
      
      const pageNumbers = thumbnails.map(t => t.pageNumber);
      expect(pageNumbers).toEqual([1, 3]);
    });

    it('should handle zero page count', async () => {
      const thumbnails = await service.generateThumbnails(mockPdfDocument, 0);

      expect(thumbnails).toEqual([]);
      expect(mockPdfDocument.getPage).not.toHaveBeenCalled();
    });

    it('should handle negative page count', async () => {
      const thumbnails = await service.generateThumbnails(mockPdfDocument, -1);

      expect(thumbnails).toEqual([]);
      expect(mockPdfDocument.getPage).not.toHaveBeenCalled();
    });
  });

  describe('generateThumbnail (private method)', () => {
    it('should generate thumbnail with correct canvas setup', async () => {
      const thumbnail = await (service as any).generateThumbnail(mockPdfDocument, 1);

      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 0.2 });
      expect(mockCanvas.width).toBe(200);
      expect(mockCanvas.height).toBe(300);
      expect(mockPage.render).toHaveBeenCalledWith({
        canvasContext: mockContext,
        viewport: jasmine.any(Object)
      });
      expect(thumbnail.pageNumber).toBe(1);
      expect(thumbnail.dataUrl).toBe('data:image/png;base64,mockThumbnailData');
    });

    it('should throw error when canvas context is null', async () => {
      mockCanvas.getContext.and.returnValue(null);

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('Failed to get canvas context');
    });

    it('should handle page rendering errors', async () => {
      mockPage.render.and.returnValue({
        promise: Promise.reject(new Error('Render failed'))
      });

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('Render failed');
    });

    it('should handle page retrieval errors', async () => {
      mockPdfDocument.getPage.and.returnValue(Promise.reject(new Error('Page not found')));

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('Page not found');
    });
  });

  describe('generateSingleThumbnail', () => {
    it('should return existing thumbnail if already cached', async () => {
      const existingThumbnail: ThumbnailData = {
        pageNumber: 1,
        dataUrl: 'existing-data'
      };
      (service as any).thumbnailCache.push(existingThumbnail);

      const result = await service.generateSingleThumbnail(mockPdfDocument, 1);

      expect(result).toBe(existingThumbnail);
      expect(mockPdfDocument.getPage).not.toHaveBeenCalled();
    });

    it('should generate new thumbnail if not cached', async () => {
      const result = await service.generateSingleThumbnail(mockPdfDocument, 1);

      expect(result.pageNumber).toBe(1);
      expect(result.dataUrl).toBe('data:image/png;base64,mockThumbnailData');
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(1);
      expect(service.getThumbnails().length).toBe(1);
    });

    it('should add generated thumbnail to cache', async () => {
      await service.generateSingleThumbnail(mockPdfDocument, 1);
      await service.generateSingleThumbnail(mockPdfDocument, 2);

      const thumbnails = service.getThumbnails();
      expect(thumbnails.length).toBe(2);
      expect(thumbnails[0].pageNumber).toBe(1);
      expect(thumbnails[1].pageNumber).toBe(2);
    });

    it('should handle generation errors', async () => {
      mockPdfDocument.getPage.and.returnValue(Promise.reject(new Error('Generation failed')));

      await expectAsync(service.generateSingleThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('Generation failed');
    });
  });

  describe('getThumbnail', () => {
    beforeEach(() => {
      // Add test thumbnails to cache
      (service as any).thumbnailCache.push(
        { pageNumber: 1, dataUrl: 'data1' },
        { pageNumber: 2, dataUrl: 'data2' },
        { pageNumber: 5, dataUrl: 'data5' }
      );
    });

    it('should return thumbnail for existing page', () => {
      const thumbnail = service.getThumbnail(2);

      expect(thumbnail).toEqual({ pageNumber: 2, dataUrl: 'data2' });
    });

    it('should return undefined for non-existing page', () => {
      const thumbnail = service.getThumbnail(3);

      expect(thumbnail).toBeUndefined();
    });

    it('should return undefined for invalid page numbers', () => {
      expect(service.getThumbnail(0)).toBeUndefined();
      expect(service.getThumbnail(-1)).toBeUndefined();
    });
  });

  describe('removeThumbnail', () => {
    beforeEach(() => {
      // Add test thumbnails to cache
      (service as any).thumbnailCache.push(
        { pageNumber: 1, dataUrl: 'data1' },
        { pageNumber: 2, dataUrl: 'data2' },
        { pageNumber: 3, dataUrl: 'data3' }
      );
    });

    it('should remove existing thumbnail', () => {
      service.removeThumbnail(2);

      const thumbnails = service.getThumbnails();
      expect(thumbnails.length).toBe(2);
      expect(thumbnails.find(t => t.pageNumber === 2)).toBeUndefined();
      expect(thumbnails.find(t => t.pageNumber === 1)).toBeDefined();
      expect(thumbnails.find(t => t.pageNumber === 3)).toBeDefined();
    });

    it('should do nothing when removing non-existing thumbnail', () => {
      const initialLength = service.getThumbnails().length;

      service.removeThumbnail(99);

      expect(service.getThumbnails().length).toBe(initialLength);
    });

    it('should handle invalid page numbers gracefully', () => {
      const initialLength = service.getThumbnails().length;

      service.removeThumbnail(0);
      service.removeThumbnail(-1);

      expect(service.getThumbnails().length).toBe(initialLength);
    });

    it('should remove first thumbnail correctly', () => {
      service.removeThumbnail(1);

      const thumbnails = service.getThumbnails();
      expect(thumbnails.length).toBe(2);
      expect(thumbnails[0].pageNumber).toBe(2);
      expect(thumbnails[1].pageNumber).toBe(3);
    });

    it('should remove last thumbnail correctly', () => {
      service.removeThumbnail(3);

      const thumbnails = service.getThumbnails();
      expect(thumbnails.length).toBe(2);
      expect(thumbnails[0].pageNumber).toBe(1);
      expect(thumbnails[1].pageNumber).toBe(2);
    });
  });

  describe('Canvas Operations', () => {
    it('should set correct canvas dimensions', async () => {
      const customViewport = {
        width: 400,
        height: 600,
        scale: 0.2
      };
      mockPage.getViewport.and.returnValue(customViewport);

      await (service as any).generateThumbnail(mockPdfDocument, 1);

      expect(mockCanvas.width).toBe(400);
      expect(mockCanvas.height).toBe(600);
    });

    it('should use correct scale for viewport', async () => {
      await (service as any).generateThumbnail(mockPdfDocument, 1);

      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 0.2 });
    });

    it('should call canvas toDataURL method', async () => {
      await (service as any).generateThumbnail(mockPdfDocument, 1);

      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle PDF document being null', async () => {
      await expectAsync(service.generateThumbnails(null, 1))
        .toBeRejected();
    });

    it('should handle PDF document being undefined', async () => {
      await expectAsync(service.generateThumbnails(undefined, 1))
        .toBeRejected();
    });

    it('should handle page viewport errors', async () => {
      mockPage.getViewport.and.throwError('Viewport error');

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('Viewport error');
    });

    it('should handle canvas creation failure', async () => {
      (document.createElement as jasmine.Spy).and.returnValue(null);

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejected();
    });

    it('should handle toDataURL errors', async () => {
      mockCanvas.toDataURL.and.throwError('toDataURL failed');

      await expectAsync((service as any).generateThumbnail(mockPdfDocument, 1))
        .toBeRejectedWithError('toDataURL failed');
    });
  });

  describe('Cache Management', () => {
    it('should maintain cache consistency after multiple operations', async () => {
      // Generate some thumbnails
      await service.generateThumbnails(mockPdfDocument, 3);
      expect(service.getThumbnails().length).toBe(3);

      // Generate single thumbnail for existing page
      await service.generateSingleThumbnail(mockPdfDocument, 2);
      expect(service.getThumbnails().length).toBe(3);

      // Generate single thumbnail for new page
      await service.generateSingleThumbnail(mockPdfDocument, 4);
      expect(service.getThumbnails().length).toBe(4);

      // Remove thumbnail
      service.removeThumbnail(2);
      expect(service.getThumbnails().length).toBe(3);

      // Clear all
      service.clearThumbnails();
      expect(service.getThumbnails().length).toBe(0);
    });

    it('should preserve thumbnail order', async () => {
      await service.generateSingleThumbnail(mockPdfDocument, 3);
      await service.generateSingleThumbnail(mockPdfDocument, 1);
      await service.generateSingleThumbnail(mockPdfDocument, 2);

      const thumbnails = service.getThumbnails();
      expect(thumbnails[0].pageNumber).toBe(3);
      expect(thumbnails[1].pageNumber).toBe(1);
      expect(thumbnails[2].pageNumber).toBe(2);
    });
  });
});
