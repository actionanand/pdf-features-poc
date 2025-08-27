import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PdfLoadResult {
  pdfSrc: Uint8Array;
  originalData: ArrayBuffer;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(private http: HttpClient) {}

  async loadPdfFromUrl(url: string): Promise<PdfLoadResult> {
    console.log('Loading PDF as blob from:', url);
    
    const response = await this.http.get(url, { 
      responseType: 'blob' 
    }).toPromise();
    
    if (!response) {
      throw new Error('Failed to load PDF');
    }

    // Convert blob to array buffer then to Uint8Array
    const arrayBuffer = await response.arrayBuffer();
    const pdfSrc = new Uint8Array(arrayBuffer);
    
    console.log('PDF loaded successfully as blob');
    
    return {
      pdfSrc,
      originalData: arrayBuffer
    };
  }

  async checkForOutline(pdfDocument: any): Promise<boolean> {
    if (!pdfDocument) return false;
    
    try {
      const outline = await pdfDocument.getOutline();
      const hasOutline = outline && outline.length > 0;
      if (hasOutline) {
        console.log('PDF has outline with', outline.length, 'items');
      }
      return hasOutline;
    } catch (error) {
      console.warn('Error checking for outline:', error);
      return false;
    }
  }

  async checkForAttachments(pdfDocument: any): Promise<boolean> {
    if (!pdfDocument) return false;
    
    try {
      const attachments = await pdfDocument.getAttachments();
      const hasAttachments = attachments && Object.keys(attachments).length > 0;
      if (hasAttachments) {
        console.log('PDF has attachments:', Object.keys(attachments));
      }
      return hasAttachments;
    } catch (error) {
      console.warn('Error checking for attachments:', error);
      return false;
    }
  }

  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (filename && filename.endsWith('.pdf')) {
        return filename;
      }
    } catch (error) {
      console.warn('Error extracting filename from URL:', error);
    }
    
    return 'document.pdf';
  }
}
