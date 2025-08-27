import { Injectable } from '@angular/core';

export interface ThumbnailData {
  pageNumber: number;
  dataUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThumbnailService {
  
  private thumbnailCache: ThumbnailData[] = [];

  constructor() {}

  getThumbnails(): ThumbnailData[] {
    return [...this.thumbnailCache];
  }

  clearThumbnails(): void {
    this.thumbnailCache = [];
  }

  async generateThumbnails(pdfDocument: any, pageCount: number): Promise<ThumbnailData[]> {
    this.clearThumbnails();
    
    const thumbnails: ThumbnailData[] = [];
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        const thumbnail = await this.generateThumbnail(pdfDocument, i);
        thumbnails.push(thumbnail);
        this.thumbnailCache.push(thumbnail);
      } catch (error) {
        console.error(`Error generating thumbnail for page ${i}:`, error);
      }
    }
    
    return thumbnails;
  }

  private async generateThumbnail(pdfDocument: any, pageNumber: number): Promise<ThumbnailData> {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.2 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    return {
      pageNumber,
      dataUrl: canvas.toDataURL()
    };
  }

  async generateSingleThumbnail(pdfDocument: any, pageNumber: number): Promise<ThumbnailData> {
    const existing = this.thumbnailCache.find(t => t.pageNumber === pageNumber);
    if (existing) {
      return existing;
    }
    
    const thumbnail = await this.generateThumbnail(pdfDocument, pageNumber);
    this.thumbnailCache.push(thumbnail);
    return thumbnail;
  }

  getThumbnail(pageNumber: number): ThumbnailData | undefined {
    return this.thumbnailCache.find(t => t.pageNumber === pageNumber);
  }

  removeThumbnail(pageNumber: number): void {
    const index = this.thumbnailCache.findIndex(t => t.pageNumber === pageNumber);
    if (index > -1) {
      this.thumbnailCache.splice(index, 1);
    }
  }
}
