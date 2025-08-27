import { Injectable } from '@angular/core';

export interface OutlineItem {
  title: string;
  dest?: any;
  url?: string;
  items?: OutlineItem[];
  expanded?: boolean;
  pageNumber?: number;
  level?: number;
  destinationCoords?: {
    pageIndex: number;
    x?: number;
    y?: number;
    zoom?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OutlineService {
  
  private outline: OutlineItem[] = [];
  private flatOutline: OutlineItem[] = [];

  constructor() {}

  getOutline(): OutlineItem[] {
    return [...this.outline];
  }

  getFlatOutline(): OutlineItem[] {
    return [...this.flatOutline];
  }

  clearOutline(): void {
    this.outline = [];
    this.flatOutline = [];
  }

  async processOutline(pdfDocument: any): Promise<OutlineItem[]> {
    try {
      const outline = await pdfDocument.getOutline();
      
      if (!outline || outline.length === 0) {
        console.log('No outline found, generating page-based index');
        this.clearOutline();
        return this.generatePageBasedIndex(pdfDocument);
      }

      console.log('Processing PDF outline with', outline.length, 'items');
      this.outline = await this.processOutlineItems(outline, pdfDocument, 0);
      this.flatOutline = this.flattenOutline(this.outline);
      
      // Check if any items have page numbers, if not, generate page-based index
      const itemsWithPages = this.flatOutline.filter(item => item.pageNumber);
      if (itemsWithPages.length === 0) {
        console.log('No page references found in outline, generating page-based index');
        return this.generatePageBasedIndex(pdfDocument);
      }
      
      console.log(`Processed outline: ${this.outline.length} items, ${itemsWithPages.length} with page numbers`);
      return this.outline;
    } catch (error) {
      console.error('Error processing outline:', error);
      this.clearOutline();
      return this.generatePageBasedIndex(pdfDocument);
    }
  }

  private async generatePageBasedIndex(pdfDocument: any): Promise<OutlineItem[]> {
    const pageCount = pdfDocument.numPages;
    const pageBasedIndex: OutlineItem[] = [];
    
    for (let i = 1; i <= pageCount; i++) {
      pageBasedIndex.push({
        title: `Page ${i}`,
        pageNumber: i,
        level: 0,
        expanded: false
      });
    }
    
    this.outline = pageBasedIndex;
    this.flatOutline = [...pageBasedIndex];
    
    console.log(`Generated page-based index for ${pageCount} pages`);
    return pageBasedIndex;
  }

  private async processOutlineItems(items: any[], pdfDocument: any, level: number): Promise<OutlineItem[]> {
    const processedItems: OutlineItem[] = [];

    for (const item of items) {
      const processedItem: OutlineItem = {
        title: this.cleanTitle(item.title) || 'Untitled',
        dest: item.dest,
        url: item.url,
        expanded: level === 0, // Auto-expand first level only
        level: level
      };

      // Get page number and destination coordinates
      if (item.dest) {
        try {
          const result = await this.getPageNumberAndCoords(pdfDocument, item.dest);
          processedItem.pageNumber = result.pageNumber;
          processedItem.destinationCoords = result.coords;
        } catch (error) {
          console.warn('Error getting page number and coordinates for outline item:', error);
        }
      }
      
      // If no page number from dest, try to extract from URL if it's a page reference
      if (!processedItem.pageNumber && item.url) {
        const pageMatch = item.url.match(/page=(\d+)/i);
        if (pageMatch) {
          processedItem.pageNumber = parseInt(pageMatch[1], 10);
        }
      }

      // Process nested items recursively
      if (item.items && item.items.length > 0) {
        processedItem.items = await this.processOutlineItems(item.items, pdfDocument, level + 1);
      }

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  private cleanTitle(title: string): string {
    if (!title) return '';
    
    // Remove common PDF bookmark artifacts
    return title
      .replace(/^\s*[\d.]+\s*/, '') // Remove leading numbers and dots
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private async getPageNumberFromDest(pdfDocument: any, dest: any): Promise<number | undefined> {
    try {
      let destination = dest;
      
      console.log('Processing destination:', dest);
      
      if (typeof dest === 'string') {
        console.log('Destination is string, resolving...');
        destination = await pdfDocument.getDestination(dest);
        console.log('Resolved destination:', destination);
      }
      
      if (destination && Array.isArray(destination) && destination.length > 0) {
        const pageRef = destination[0];
        console.log('Page reference:', pageRef);
        
        // Handle different types of page references
        if (typeof pageRef === 'number') {
          // Direct page number (0-based)
          console.log('Direct page number found:', pageRef + 1);
          return pageRef + 1;
        } else if (pageRef && typeof pageRef === 'object') {
          // Page reference object
          try {
            const pageIndex = await pdfDocument.getPageIndex(pageRef);
            const pageNumber = pageIndex + 1; // Convert to 1-based page number
            console.log('Resolved page number:', pageNumber);
            return pageNumber;
          } catch (refError) {
            console.warn('Error resolving page reference object:', refError);
            // Try alternative approach - some PDFs use different reference formats
            if (pageRef.num !== undefined) {
              console.log('Using page ref num:', pageRef.num);
              return pageRef.num;
            }
          }
        }
      } else {
        console.warn('No valid destination array found:', destination);
      }
    } catch (error) {
      console.warn('Error resolving destination:', error);
    }
    
    return undefined;
  }

  private async getPageNumberAndCoords(pdfDocument: any, dest: any): Promise<{pageNumber?: number, coords?: {pageIndex: number, x?: number, y?: number, zoom?: number}}> {
    try {
      let destination = dest;
      
      if (typeof dest === 'string') {
        console.log('Destination is string, resolving...');
        destination = await pdfDocument.getDestination(dest);
        console.log('Resolved destination:', destination);
      }
      
      if (destination && Array.isArray(destination) && destination.length > 0) {
        const pageRef = destination[0];
        let pageNumber: number | undefined;
        let pageIndex: number | undefined;
        
        // Handle different types of page references
        if (typeof pageRef === 'number') {
          // Direct page number (0-based)
          pageNumber = pageRef + 1;
          pageIndex = pageRef;
        } else if (pageRef && typeof pageRef === 'object') {
          // Page reference object
          try {
            const resolvedPageIndex = await pdfDocument.getPageIndex(pageRef);
            pageIndex = resolvedPageIndex;
            pageNumber = resolvedPageIndex + 1; // Convert to 1-based page number
          } catch (refError) {
            console.warn('Error resolving page reference object:', refError);
            // Try alternative approach
            if (pageRef.num !== undefined) {
              pageNumber = pageRef.num;
              pageIndex = pageRef.num - 1;
            }
          }
        }
        
        if (pageNumber && pageIndex !== undefined) {
          const coords: {pageIndex: number, x?: number, y?: number, zoom?: number} = {
            pageIndex: pageIndex
          };
          
          // Extract coordinates if available
          // PDF destination format: [pageRef, name, left, top, zoom]
          if (destination.length > 1) {
            const viewType = destination[1];
            console.log('View type:', viewType);
            
            // Handle different view types
            if (viewType && typeof viewType === 'object' && viewType.name === 'XYZ') {
              // XYZ view: [pageRef, {name: 'XYZ'}, left, top, zoom]
              if (destination.length > 2 && destination[2] !== null) {
                coords.x = destination[2];
              }
              if (destination.length > 3 && destination[3] !== null) {
                coords.y = destination[3];
              }
              if (destination.length > 4 && destination[4] !== null) {
                coords.zoom = destination[4];
              }
            } else if (viewType && typeof viewType === 'object' && viewType.name === 'FitH') {
              // FitH view: [pageRef, {name: 'FitH'}, top]
              if (destination.length > 2 && destination[2] !== null) {
                coords.y = destination[2];
              }
            }
          }
          
          console.log('Extracted coordinates for', pageNumber, ':', coords);
          return { pageNumber, coords };
        }
      }
    } catch (error) {
      console.warn('Error resolving destination coordinates:', error);
    }
    
    return {};
  }

  private flattenOutline(items: OutlineItem[]): OutlineItem[] {
    const flattened: OutlineItem[] = [];
    
    for (const item of items) {
      flattened.push(item);
      if (item.items && item.items.length > 0) {
        flattened.push(...this.flattenOutline(item.items));
      }
    }
    
    return flattened;
  }

  toggleExpanded(item: OutlineItem): void {
    item.expanded = !item.expanded;
  }

  expandAll(): void {
    this.expandAllItems(this.outline);
  }

  collapseAll(): void {
    this.collapseAllItems(this.outline);
  }

  private expandAllItems(items: OutlineItem[]): void {
    for (const item of items) {
      item.expanded = true;
      if (item.items && item.items.length > 0) {
        this.expandAllItems(item.items);
      }
    }
  }

  private collapseAllItems(items: OutlineItem[]): void {
    for (const item of items) {
      item.expanded = false;
      if (item.items && item.items.length > 0) {
        this.collapseAllItems(item.items);
      }
    }
  }

  findItemByTitle(title: string): OutlineItem | undefined {
    return this.flatOutline.find(item => item.title === title);
  }

  findItemByPage(pageNumber: number): OutlineItem | undefined {
    return this.flatOutline.find(item => item.pageNumber === pageNumber);
  }

  getVisibleItems(items: OutlineItem[] = this.outline): OutlineItem[] {
    const visible: OutlineItem[] = [];
    
    for (const item of items) {
      visible.push(item);
      if (item.expanded && item.items && item.items.length > 0) {
        visible.push(...this.getVisibleItems(item.items));
      }
    }
    
    return visible;
  }
}
