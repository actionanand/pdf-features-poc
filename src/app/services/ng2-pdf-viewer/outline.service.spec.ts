import { TestBed } from '@angular/core/testing';
import { OutlineService, OutlineItem } from './outline.service';

describe('OutlineService', () => {
  let service: OutlineService;
  let mockPdfDocument: jasmine.SpyObj<any>;

  // Mock outline data
  const mockOutlineData = [
    {
      title: '1. Introduction',
      dest: ['page1', { name: 'XYZ' }, 100, 200, null],
      items: [
        {
          title: '1.1 Overview',
          dest: ['page2', { name: 'XYZ' }, 0, 0, null],
          items: []
        },
        {
          title: '1.2 Scope',
          dest: ['page3', { name: 'FitH' }, 150],
          items: []
        }
      ]
    },
    {
      title: '2. Technical Details',
      dest: ['page4', { name: 'XYZ' }, null, null, 1.0],
      items: []
    }
  ];

  const mockSimpleOutline = [
    {
      title: 'Chapter 1',
      dest: 'dest1',
      items: []
    }
  ];

  beforeEach(() => {
    // Create mock PDF document
    mockPdfDocument = jasmine.createSpyObj('pdfDocument', [
      'getOutline', 'getDestination', 'getPageIndex'
    ], {
      numPages: 10
    });

    TestBed.configureTestingModule({
      providers: [OutlineService]
    });
    service = TestBed.inject(OutlineService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty outline', () => {
      expect(service.getOutline()).toEqual([]);
      expect(service.getFlatOutline()).toEqual([]);
    });
  });

  describe('getOutline', () => {
    it('should return a copy of the outline', () => {
      const outline1 = service.getOutline();
      const outline2 = service.getOutline();

      expect(outline1).toEqual(outline2);
      expect(outline1).not.toBe(outline2);
    });

    it('should return current outline after processing', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockSimpleOutline));
      mockPdfDocument.getDestination.and.returnValue(Promise.resolve(['page1', { name: 'XYZ' }]));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);
      const outline = service.getOutline();

      expect(outline.length).toBeGreaterThan(0);
    });
  });

  describe('getFlatOutline', () => {
    it('should return a copy of the flat outline', () => {
      const flat1 = service.getFlatOutline();
      const flat2 = service.getFlatOutline();

      expect(flat1).toEqual(flat2);
      expect(flat1).not.toBe(flat2);
    });

    it('should return flattened structure after processing', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.callFake((ref: any) => {
        const pageMap: any = { 'page1': 0, 'page2': 1, 'page3': 2, 'page4': 3 };
        return Promise.resolve(pageMap[ref] || 0);
      });

      await service.processOutline(mockPdfDocument);
      const flatOutline = service.getFlatOutline();

      expect(flatOutline.length).toBe(4); // All items flattened
    });
  });

  describe('clearOutline', () => {
    it('should clear both outline and flat outline', async () => {
      // First add some data
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockSimpleOutline));
      mockPdfDocument.getDestination.and.returnValue(Promise.resolve(['page1', { name: 'XYZ' }]));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);
      expect(service.getOutline().length).toBeGreaterThan(0);

      service.clearOutline();

      expect(service.getOutline()).toEqual([]);
      expect(service.getFlatOutline()).toEqual([]);
    });
  });

  describe('processOutline', () => {
    it('should process valid outline', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.callFake((ref: any) => {
        const pageMap: any = { 'page1': 0, 'page2': 1, 'page3': 2, 'page4': 3 };
        return Promise.resolve(pageMap[ref] || 0);
      });

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Introduction');
      expect(result[0].items?.length).toBe(2);
      expect(result[1].title).toBe('Technical Details');
    });

    it('should generate page-based index when outline is empty', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));
      spyOn(console, 'log');

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(10); // numPages
      expect(result[0].title).toBe('Page 1');
      expect(result[9].title).toBe('Page 10');
      expect(console.log).toHaveBeenCalledWith('No outline found, generating page-based index');
    });

    it('should generate page-based index when outline is null', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(null));

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(10);
      expect(result[0].title).toBe('Page 1');
    });

    it('should handle outline processing errors', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.reject(new Error('Outline error')));
      spyOn(console, 'error');

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(10); // Falls back to page-based index
      expect(console.error).toHaveBeenCalledWith('Error processing outline:', jasmine.any(Error));
    });

    it('should fall back to page-based index when no page numbers found', async () => {
      const outlineWithoutPages = [
        { title: 'No Pages', dest: null, items: [] }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithoutPages));
      spyOn(console, 'log');

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(10);
      expect(console.log).toHaveBeenCalledWith('No page references found in outline, generating page-based index');
    });

    it('should log processing information', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));
      spyOn(console, 'log');

      await service.processOutline(mockPdfDocument);

      expect(console.log).toHaveBeenCalledWith('Processing PDF outline with', 2, 'items');
    });
  });

  describe('generatePageBasedIndex', () => {
    it('should generate correct page-based index', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(10);
      result.forEach((item, index) => {
        expect(item.title).toBe(`Page ${index + 1}`);
        expect(item.pageNumber).toBe(index + 1);
        expect(item.level).toBe(0);
        expect(item.expanded).toBe(false);
      });
    });

    it('should handle documents with different page counts', async () => {
      mockPdfDocument.numPages = 25;
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBe(25);
      expect(result[24].title).toBe('Page 25');
    });

    it('should log generation information', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));
      spyOn(console, 'log');

      await service.processOutline(mockPdfDocument);

      expect(console.log).toHaveBeenCalledWith('Generated page-based index for 10 pages');
    });
  });

  describe('processOutlineItems', () => {
    it('should process nested outline items', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.callFake((ref: any) => {
        const pageMap: any = { 'page1': 0, 'page2': 1, 'page3': 2, 'page4': 3 };
        return Promise.resolve(pageMap[ref] || 0);
      });

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].items?.length).toBe(2);
      expect(result[0].items?.[0].title).toBe('Overview');
      expect(result[0].items?.[1].title).toBe('Scope');
    });

    it('should handle items with URL page references', async () => {
      const outlineWithUrl = [
        {
          title: 'URL Reference',
          url: 'http://example.com#page=5',
          dest: null,
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithUrl));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].pageNumber).toBe(5);
    });

    it('should set correct expansion levels', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].expanded).toBe(true); // Level 0
      expect(result[0].items?.[0].expanded).toBe(false); // Level 1
    });

    it('should handle items without titles', async () => {
      const outlineWithoutTitle = [
        { title: '', dest: null, items: [] },
        { title: null, dest: null, items: [] }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithoutTitle));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].title).toBe('Untitled');
      expect(result[1].title).toBe('Untitled');
    });
  });

  describe('cleanTitle', () => {
    it('should remove leading numbers and normalize whitespace', async () => {
      const outlineWithNumberedTitles = [
        { title: '1. Introduction', dest: null, items: [] },
        { title: '2.1   Subsection   with   spaces', dest: null, items: [] },
        { title: '   3.4.1  Multiple  levels  ', dest: null, items: [] }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithNumberedTitles));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].title).toBe('Introduction');
      expect(result[1].title).toBe('Subsection with spaces');
      expect(result[2].title).toBe('Multiple levels');
    });

    it('should handle empty or whitespace-only titles', async () => {
      const outlineWithEmptyTitles = [
        { title: '', dest: null, items: [] },
        { title: '   ', dest: null, items: [] },
        { title: null, dest: null, items: [] }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithEmptyTitles));

      const result = await service.processOutline(mockPdfDocument);

      result.forEach(item => {
        expect(item.title).toBe('Untitled');
      });
    });
  });

  describe('getPageNumberAndCoords', () => {
    it('should extract page number and coordinates from XYZ destination', async () => {
      const outlineWithXYZ = [
        {
          title: 'XYZ Test',
          dest: ['pageRef', { name: 'XYZ' }, 100, 200, 1.5],
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithXYZ));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(2));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].pageNumber).toBe(3); // 0-based to 1-based
      expect(result[0].destinationCoords).toEqual({
        pageIndex: 2,
        x: 100,
        y: 200,
        zoom: 1.5
      });
    });

    it('should extract page number and coordinates from FitH destination', async () => {
      const outlineWithFitH = [
        {
          title: 'FitH Test',
          dest: ['pageRef', { name: 'FitH' }, 300],
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithFitH));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(1));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].pageNumber).toBe(2);
      expect(result[0].destinationCoords).toEqual({
        pageIndex: 1,
        y: 300
      });
    });

    it('should handle string destinations', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockSimpleOutline));
      mockPdfDocument.getDestination.and.returnValue(Promise.resolve(['pageRef', { name: 'XYZ' }]));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));
      spyOn(console, 'log');

      await service.processOutline(mockPdfDocument);

      expect(mockPdfDocument.getDestination).toHaveBeenCalledWith('dest1');
      expect(console.log).toHaveBeenCalledWith('Destination is string, resolving...');
    });

    it('should handle numeric page references', async () => {
      const outlineWithNumericRef = [
        {
          title: 'Numeric Ref',
          dest: [5, { name: 'XYZ' }],
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithNumericRef));

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].pageNumber).toBe(6); // 0-based to 1-based
    });

    it('should handle page reference objects with num property', async () => {
      const outlineWithRefObject = [
        {
          title: 'Ref Object',
          dest: [{ num: 7 }, { name: 'XYZ' }],
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithRefObject));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.reject(new Error('Reference error')));
      spyOn(console, 'warn');

      const result = await service.processOutline(mockPdfDocument);

      expect(result[0].pageNumber).toBe(7);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle coordinate extraction errors', async () => {
      const outlineWithBadDest = [
        {
          title: 'Bad Dest',
          dest: 'invalid',
          items: []
        }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(outlineWithBadDest));
      mockPdfDocument.getDestination.and.returnValue(Promise.reject(new Error('Dest error')));
      spyOn(console, 'warn');

      await service.processOutline(mockPdfDocument);

      expect(console.warn).toHaveBeenCalledWith('Error getting page number and coordinates for outline item:', jasmine.any(Error));
    });
  });

  describe('flattenOutline', () => {
    it('should create flat representation of nested outline', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);
      const flatOutline = service.getFlatOutline();

      expect(flatOutline.length).toBe(4);
      expect(flatOutline[0].title).toBe('Introduction');
      expect(flatOutline[1].title).toBe('Overview');
      expect(flatOutline[2].title).toBe('Scope');
      expect(flatOutline[3].title).toBe('Technical Details');
    });
  });

  describe('toggleExpanded', () => {
    it('should toggle expansion state', () => {
      const item: OutlineItem = { title: 'Test', expanded: false };

      service.toggleExpanded(item);
      expect(item.expanded).toBe(true);

      service.toggleExpanded(item);
      expect(item.expanded).toBe(false);
    });
  });

  describe('expandAll', () => {
    it('should expand all items', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);
      
      // Initially, only level 0 is expanded
      const outline = service.getOutline();
      expect(outline[0].expanded).toBe(true);
      expect(outline[0].items?.[0].expanded).toBe(false);

      service.expandAll();

      expect(outline[0].expanded).toBe(true);
      expect(outline[0].items?.[0].expanded).toBe(true);
      expect(outline[0].items?.[1].expanded).toBe(true);
    });
  });

  describe('collapseAll', () => {
    it('should collapse all items', async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);
      service.expandAll();

      service.collapseAll();

      const outline = service.getOutline();
      expect(outline[0].expanded).toBe(false);
      expect(outline[0].items?.[0].expanded).toBe(false);
      expect(outline[0].items?.[1].expanded).toBe(false);
    });
  });

  describe('findItemByTitle', () => {
    beforeEach(async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));
      await service.processOutline(mockPdfDocument);
    });

    it('should find item by exact title match', () => {
      const item = service.findItemByTitle('Introduction');
      expect(item).toBeDefined();
      expect(item?.title).toBe('Introduction');
    });

    it('should return undefined for non-existent title', () => {
      const item = service.findItemByTitle('Non-existent');
      expect(item).toBeUndefined();
    });

    it('should find nested items', () => {
      const item = service.findItemByTitle('Overview');
      expect(item).toBeDefined();
      expect(item?.title).toBe('Overview');
    });
  });

  describe('findItemByPage', () => {
    beforeEach(async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.callFake((ref: any) => {
        const pageMap: any = { 'page1': 0, 'page2': 1, 'page3': 2, 'page4': 3 };
        return Promise.resolve(pageMap[ref] || 0);
      });
      await service.processOutline(mockPdfDocument);
    });

    it('should find item by page number', () => {
      const item = service.findItemByPage(1);
      expect(item).toBeDefined();
      expect(item?.pageNumber).toBe(1);
    });

    it('should return undefined for non-existent page', () => {
      const item = service.findItemByPage(999);
      expect(item).toBeUndefined();
    });
  });

  describe('getVisibleItems', () => {
    beforeEach(async () => {
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));
      await service.processOutline(mockPdfDocument);
    });

    it('should return only top-level items when collapsed', () => {
      service.collapseAll();
      const visible = service.getVisibleItems();

      expect(visible.length).toBe(2);
      expect(visible[0].title).toBe('Introduction');
      expect(visible[1].title).toBe('Technical Details');
    });

    it('should return nested items when expanded', () => {
      service.expandAll();
      const visible = service.getVisibleItems();

      expect(visible.length).toBe(4);
      expect(visible[0].title).toBe('Introduction');
      expect(visible[1].title).toBe('Overview');
      expect(visible[2].title).toBe('Scope');
      expect(visible[3].title).toBe('Technical Details');
    });

    it('should handle partial expansion', () => {
      const outline = service.getOutline();
      outline[0].expanded = true; // Expand first item
      outline[1].expanded = false; // Keep second item collapsed

      const visible = service.getVisibleItems();

      expect(visible.length).toBe(4); // First item + its children + second item
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null PDF document', async () => {
      await expectAsync(service.processOutline(null)).toBeRejected();
    });

    it('should handle undefined PDF document', async () => {
      await expectAsync(service.processOutline(undefined)).toBeRejected();
    });

    it('should handle PDF with zero pages', async () => {
      mockPdfDocument.numPages = 0;
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([]));

      const result = await service.processOutline(mockPdfDocument);

      expect(result).toEqual([]);
    });

    it('should handle malformed outline data', async () => {
      const malformedOutline = [
        { title: null, dest: undefined, items: null },
        { /* missing properties */ }
      ];
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(malformedOutline));

      const result = await service.processOutline(mockPdfDocument);

      expect(result.length).toBeGreaterThan(0); // Should fall back to page-based index
    });

    it('should handle extremely nested outline', async () => {
      const deeplyNested = {
        title: 'Level 1',
        dest: null,
        items: [{
          title: 'Level 2',
          dest: null,
          items: [{
            title: 'Level 3',
            dest: null,
            items: []
          }]
        }]
      };
      mockPdfDocument.getOutline.and.returnValue(Promise.resolve([deeplyNested]));

      const result = await service.processOutline(mockPdfDocument);
      const flatOutline = service.getFlatOutline();

      expect(result.length).toBe(1);
      expect(flatOutline.length).toBe(3);
    });
  });

  describe('Console Logging', () => {
    it('should log processing steps', async () => {
      spyOn(console, 'log');
      spyOn(console, 'warn');
      spyOn(console, 'error');

      mockPdfDocument.getOutline.and.returnValue(Promise.resolve(mockOutlineData));
      mockPdfDocument.getPageIndex.and.returnValue(Promise.resolve(0));

      await service.processOutline(mockPdfDocument);

      expect(console.log).toHaveBeenCalledTimes(2); // Processing message + processed message
    });
  });
});
