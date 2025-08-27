import { Injectable } from '@angular/core';

export interface AttachmentInfo {
  filename: string;
  originalFilename: string;
  description: string;
  size: number;
  content: Uint8Array;
}

export interface FileSignature {
  signature: number[];
  extension: string;
  mimeType: string;
  validator?: (bytes: Uint8Array) => { extension: string; mimeType: string } | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {

  private readonly fileSignatures: FileSignature[] = [
    // Documents
    { signature: [0x25, 0x50, 0x44, 0x46], extension: 'pdf', mimeType: 'application/pdf' },
    { signature: [0x7B, 0x5C, 0x72, 0x74], extension: 'rtf', mimeType: 'application/rtf' },
    { signature: [0x3C, 0x3F, 0x78, 0x6D], extension: 'xml', mimeType: 'application/xml' },
    { signature: [0x3C, 0x68, 0x74, 0x6D], extension: 'html', mimeType: 'text/html' },
    
    // Images
    { signature: [0xFF, 0xD8, 0xFF], extension: 'jpg', mimeType: 'image/jpeg' },
    { signature: [0x89, 0x50, 0x4E, 0x47], extension: 'png', mimeType: 'image/png' },
    { signature: [0x47, 0x49, 0x46], extension: 'gif', mimeType: 'image/gif' },
    { signature: [0x42, 0x4D], extension: 'bmp', mimeType: 'image/bmp' },
    { signature: [0x49, 0x49, 0x2A, 0x00], extension: 'tiff', mimeType: 'image/tiff' },
    { signature: [0x4D, 0x4D, 0x00, 0x2A], extension: 'tiff', mimeType: 'image/tiff' },
    
    // Audio/Video
    { signature: [0xFF, 0xFB], extension: 'mp3', mimeType: 'audio/mpeg' },
    { signature: [0x49, 0x44, 0x33], extension: 'mp3', mimeType: 'audio/mpeg' },
    { signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], extension: 'mp4', mimeType: 'video/mp4' },
    { 
      signature: [0x52, 0x49, 0x46, 0x46], 
      extension: 'wav', 
      mimeType: 'audio/wav',
      validator: (bytes) => bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
    },
    { 
      signature: [0x52, 0x49, 0x46, 0x46], 
      extension: 'avi', 
      mimeType: 'video/x-msvideo',
      validator: (bytes) => bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49
    },
    
    // Archives
    { signature: [0x1F, 0x8B], extension: 'gz', mimeType: 'application/gzip' },
    { signature: [0x42, 0x5A, 0x68], extension: 'bz2', mimeType: 'application/x-bzip2' },
    { signature: [0x37, 0x7A, 0xBC, 0xAF], extension: '7z', mimeType: 'application/x-7z-compressed' },
    { signature: [0x52, 0x61, 0x72, 0x21], extension: 'rar', mimeType: 'application/vnd.rar' },
    
    // Executables
    { signature: [0x4D, 0x5A], extension: 'exe', mimeType: 'application/x-msdownload' },
    { signature: [0x7F, 0x45, 0x4C, 0x46], extension: 'elf', mimeType: 'application/x-executable' },
    { signature: [0xFE, 0xED, 0xFA, 0xCE], extension: 'macho', mimeType: 'application/x-mach-binary' },
    { signature: [0xFE, 0xED, 0xFA, 0xCF], extension: 'macho', mimeType: 'application/x-mach-binary' },
    { signature: [0xCF, 0xFA, 0xED, 0xFE], extension: 'macho', mimeType: 'application/x-mach-binary' },
    { signature: [0xCA, 0xFE, 0xBA, 0xBE], extension: 'class', mimeType: 'application/java-vm' },
    { signature: [0x21, 0x3C, 0x61, 0x72], extension: 'a', mimeType: 'application/x-archive' },
    { signature: [0x78, 0x01], extension: 'zlib', mimeType: 'application/x-compress' },
    { signature: [0x23, 0x21], extension: 'sh', mimeType: 'application/x-sh' },
    
    // Office Legacy
    { 
      signature: [0xD0, 0xCF, 0x11, 0xE0], 
      extension: 'ole', 
      mimeType: 'application/octet-stream',
      validator: (bytes) => this.detectLegacyOfficeFormat(bytes)
    },
    
    // ZIP-based (must be last due to complex validation)
    { 
      signature: [0x50, 0x4B], 
      extension: 'zip', 
      mimeType: 'application/zip',
      validator: (bytes) => this.detectZipBasedFormat(bytes)
    }
  ];

  private readonly extensionMimeMap = new Map<string, string>([
    // Images
    ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['gif', 'image/gif'],
    ['bmp', 'image/bmp'], ['tiff', 'image/tiff'], ['tif', 'image/tiff'], ['svg', 'image/svg+xml'],
    ['webp', 'image/webp'], ['ico', 'image/x-icon'],
    
    // Documents
    ['pdf', 'application/pdf'], ['txt', 'text/plain'], ['rtf', 'application/rtf'],
    ['html', 'text/html'], ['htm', 'text/html'], ['css', 'text/css'], ['xml', 'application/xml'],
    ['json', 'application/json'], ['csv', 'text/csv'], ['md', 'text/markdown'], ['markdown', 'text/markdown'],
    
    // Office
    ['doc', 'application/msword'], ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['xls', 'application/vnd.ms-excel'], ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['ppt', 'application/vnd.ms-powerpoint'], ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['odt', 'application/vnd.oasis.opendocument.text'], ['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
    ['odp', 'application/vnd.oasis.opendocument.presentation'],
    
    // Archives
    ['zip', 'application/zip'], ['rar', 'application/vnd.rar'], ['7z', 'application/x-7z-compressed'],
    ['gz', 'application/gzip'], ['gzip', 'application/gzip'], ['bz2', 'application/x-bzip2'], ['tar', 'application/x-tar'],
    
    // Audio
    ['mp3', 'audio/mpeg'], ['wav', 'audio/wav'], ['ogg', 'audio/ogg'], ['flac', 'audio/flac'], ['aac', 'audio/aac'],
    
    // Video
    ['mp4', 'video/mp4'], ['avi', 'video/x-msvideo'], ['mov', 'video/quicktime'], ['wmv', 'video/x-ms-wmv'],
    ['flv', 'video/x-flv'], ['webm', 'video/webm'], ['mkv', 'video/x-matroska'],
    
    // Programming
    ['js', 'application/javascript'], ['py', 'text/x-python'], ['rb', 'application/x-ruby'],
    ['php', 'application/x-httpd-php'], ['lua', 'text/x-lua'], ['go', 'text/x-go'], ['rs', 'text/x-rust'],
    ['swift', 'text/x-swift'], ['kt', 'text/x-kotlin'], ['scala', 'text/x-scala'], ['r', 'text/x-r'],
    ['matlab', 'text/x-matlab'], ['m', 'text/x-matlab'], ['pl', 'application/x-perl'],
    
    // Executables
    ['exe', 'application/x-msdownload'], ['dll', 'application/x-msdownload'], ['sys', 'application/x-msdownload'],
    ['com', 'application/x-msdownload'], ['scr', 'application/x-msdownload'], ['bat', 'application/x-bat'],
    ['cmd', 'application/x-bat'], ['ps1', 'application/x-powershell'], ['elf', 'application/x-executable'],
    ['macho', 'application/x-mach-binary'], ['app', 'application/x-mac-app'], ['class', 'application/java-vm'],
    ['jar', 'application/java-archive'], ['apk', 'application/vnd.android.package-archive'],
    
    // Shell scripts
    ['sh', 'application/x-sh'], ['bash', 'application/x-sh'], ['zsh', 'application/x-sh'],
    ['csh', 'application/x-csh'], ['fish', 'application/x-sh'],
    
    // System
    ['so', 'application/x-sharedlib'], ['dylib', 'application/x-sharedlib'], ['framework', 'application/x-mac-framework'],
    ['a', 'application/x-archive'], ['dmg', 'application/x-apple-diskimage'], ['deb', 'application/vnd.debian.binary-package'],
    ['rpm', 'application/x-rpm'], ['msi', 'application/x-msi'], ['zlib', 'application/x-compress'],
    
    // Fallbacks
    ['bin', 'application/octet-stream'], ['ole', 'application/octet-stream']
  ]);

  constructor() {}

  async generateAttachments(pdfDocument: any): Promise<AttachmentInfo[]> {
    if (!pdfDocument) return [];
    
    try {
      const attachments = await pdfDocument.getAttachments();
      const attachmentList: AttachmentInfo[] = [];
      
      if (attachments) {
        for (const [filename, attachment] of Object.entries(attachments)) {
          const attachmentData = attachment as any;
          const content = attachmentData.content;
          
          const finalFilename = this.ensureFileExtension(filename, content);
          
          attachmentList.push({
            filename: finalFilename,
            originalFilename: filename,
            description: attachmentData.description || '',
            size: content?.length || 0,
            content: content,
          });
        }
        console.log('Generated attachments list:', attachmentList);
      }
      
      return attachmentList;
    } catch (error) {
      console.error('Error generating attachments:', error);
      return [];
    }
  }

  downloadAttachment(attachment: AttachmentInfo): void {
    if (!attachment.content) return;
    
    const mimeType = this.getMimeTypeFromExtension(attachment.filename);
    const blob = new Blob([attachment.content as any], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = attachment.filename;
    link.style.display = 'none';
    
    // Add to DOM, click, and immediately remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  private ensureFileExtension(filename: string, content: Uint8Array): string {
    if (filename.includes('.')) {
      return filename; // Already has extension
    }
    
    if (!content || content.length < 4) {
      return filename + '.bin';
    }
    
    const detectedInfo = this.detectFileType(content);
    return filename + '.' + detectedInfo.extension;
  }

  private detectFileType(bytes: Uint8Array): { extension: string; mimeType: string } {
    for (const sig of this.fileSignatures) {
      if (this.matchesSignature(bytes, sig.signature)) {
        if (sig.validator) {
          const result = sig.validator(bytes);
          if (typeof result === 'boolean' && result) {
            return { extension: sig.extension, mimeType: sig.mimeType };
          } else if (typeof result === 'object') {
            return result;
          }
        } else {
          return { extension: sig.extension, mimeType: sig.mimeType };
        }
      }
    }
    
    return { extension: 'bin', mimeType: 'application/octet-stream' };
  }

  private matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
    if (bytes.length < signature.length) return false;
    
    return signature.every((byte, index) => bytes[index] === byte);
  }

  private detectLegacyOfficeFormat(bytes: Uint8Array): { extension: string; mimeType: string } | boolean {
    const contentStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1000));
    
    if (contentStr.includes('Word.Document') || contentStr.includes('Microsoft Office Word')) {
      return { extension: 'doc', mimeType: 'application/msword' };
    } else if (contentStr.includes('Excel') || contentStr.includes('Worksheet')) {
      return { extension: 'xls', mimeType: 'application/vnd.ms-excel' };
    } else if (contentStr.includes('PowerPoint') || contentStr.includes('Microsoft Office PowerPoint')) {
      return { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint' };
    }
    
    return { extension: 'ole', mimeType: 'application/octet-stream' };
  }

  private detectZipBasedFormat(bytes: Uint8Array): { extension: string; mimeType: string } | boolean {
    const contentStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1000));
    
    if (contentStr.includes('xl/workbook.xml') || contentStr.includes('xl/')) {
      return { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    } else if (contentStr.includes('word/document.xml') || contentStr.includes('word/')) {
      return { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    } else if (contentStr.includes('ppt/presentation.xml') || contentStr.includes('ppt/')) {
      return { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    } else if (contentStr.includes('META-INF/') && contentStr.includes('.jar')) {
      return { extension: 'jar', mimeType: 'application/java-archive' };
    } else if (contentStr.includes('AndroidManifest.xml')) {
      return { extension: 'apk', mimeType: 'application/vnd.android.package-archive' };
    }
    
    return true; // Default to ZIP
  }

  private getMimeTypeFromExtension(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return this.extensionMimeMap.get(extension || '') || 'application/octet-stream';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
