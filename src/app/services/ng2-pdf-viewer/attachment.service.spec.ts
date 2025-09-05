import { TestBed } from '@angular/core/testing';
import { AttachmentService, AttachmentInfo, FileSignature } from './attachment.service';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let mockPdfDocument: jasmine.SpyObj<any>;

  // Mock attachment data
  const mockAttachments = {
    'document.pdf': {
      content: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]), // PDF signature
      description: 'Sample PDF document'
    },
    'image.jpg': {
      content: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]), // JPEG signature
      description: 'Sample image'
    },
    'unknown_file': {
      content: new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]), // Unknown format
      description: 'Unknown file type'
    },
    'text.txt': {
      content: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F]), // "Hello Wo"
      description: 'Text file'
    }
  };

  beforeEach(() => {
    // Create mock PDF document
    mockPdfDocument = jasmine.createSpyObj('pdfDocument', ['getAttachments']);

    TestBed.configureTestingModule({
      providers: [AttachmentService]
    });
    service = TestBed.inject(AttachmentService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('generateAttachments', () => {
    it('should generate attachments from PDF document', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(mockAttachments));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result.length).toBe(4);
      expect(result[0].filename).toBe('document.pdf');
      expect(result[0].originalFilename).toBe('document.pdf');
      expect(result[0].description).toBe('Sample PDF document');
      expect(result[0].size).toBe(8);
      expect(result[0].content).toEqual(mockAttachments['document.pdf'].content);
    });

    it('should handle empty attachments', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve({}));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result).toEqual([]);
    });

    it('should handle null attachments', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(null));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result).toEqual([]);
    });

    it('should handle undefined attachments', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(undefined));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result).toEqual([]);
    });

    it('should handle null PDF document', async () => {
      const result = await service.generateAttachments(null);

      expect(result).toEqual([]);
    });

    it('should handle undefined PDF document', async () => {
      const result = await service.generateAttachments(undefined);

      expect(result).toEqual([]);
    });

    it('should handle getAttachments error', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.reject(new Error('Attachments error')));
      spyOn(console, 'error');

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error generating attachments:', jasmine.any(Error));
    });

    it('should add file extension to files without extension', async () => {
      const attachmentsWithoutExt = {
        'no_extension': {
          content: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // PDF signature
          description: 'PDF without extension'
        }
      };
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(attachmentsWithoutExt));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result[0].filename).toBe('no_extension.pdf');
      expect(result[0].originalFilename).toBe('no_extension');
    });

    it('should handle attachments with missing content', async () => {
      const attachmentsWithoutContent = {
        'empty_file': {
          content: null,
          description: 'Empty file'
        }
      };
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(attachmentsWithoutContent));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result[0].size).toBe(0);
      expect(result[0].content).toBeNull();
    });

    it('should handle attachments with missing description', async () => {
      const attachmentsWithoutDesc = {
        'test.pdf': {
          content: new Uint8Array([0x25, 0x50, 0x44, 0x46])
        }
      };
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(attachmentsWithoutDesc));

      const result = await service.generateAttachments(mockPdfDocument);

      expect(result[0].description).toBe('');
    });

    it('should log generated attachments', async () => {
      mockPdfDocument.getAttachments.and.returnValue(Promise.resolve(mockAttachments));
      spyOn(console, 'log');

      await service.generateAttachments(mockPdfDocument);

      expect(console.log).toHaveBeenCalledWith('Generated attachments list:', jasmine.any(Array));
    });
  });

  describe('downloadAttachment', () => {
    let mockLink: jasmine.SpyObj<HTMLAnchorElement>;
    let mockBlob: jasmine.SpyObj<Blob>;
    let mockURL: jasmine.SpyObj<any>;

    beforeEach(() => {
      mockLink = jasmine.createSpyObj('a', ['click'], {
        href: '',
        download: '',
        style: { display: '' }
      });

      mockBlob = jasmine.createSpyObj('Blob', [], {});

      mockURL = jasmine.createSpyObj('URL', ['createObjectURL', 'revokeObjectURL']);
      mockURL.createObjectURL.and.returnValue('blob:mock-url');

      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(window, 'Blob').and.returnValue(mockBlob);
      (window as any).URL = mockURL;

      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should download attachment with correct properties', () => {
      const attachment: AttachmentInfo = {
        filename: 'test.pdf',
        originalFilename: 'test.pdf',
        description: 'Test file',
        size: 100,
        content: new Uint8Array([1, 2, 3, 4])
      };

      service.downloadAttachment(attachment);

      expect(window.Blob).toHaveBeenCalledWith([attachment.content], { type: 'application/pdf' });
      expect(mockURL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe('test.pdf');
      expect(mockLink.style.display).toBe('none');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });

    it('should revoke object URL after timeout', () => {
      const attachment: AttachmentInfo = {
        filename: 'test.pdf',
        originalFilename: 'test.pdf',
        description: 'Test file',
        size: 100,
        content: new Uint8Array([1, 2, 3, 4])
      };

      service.downloadAttachment(attachment);

      jasmine.clock().tick(100);

      expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should not download when content is null', () => {
      const attachment: AttachmentInfo = {
        filename: 'test.pdf',
        originalFilename: 'test.pdf',
        description: 'Test file',
        size: 0,
        content: null as any
      };

      service.downloadAttachment(attachment);

      expect(window.Blob).not.toHaveBeenCalled();
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should not download when content is undefined', () => {
      const attachment: AttachmentInfo = {
        filename: 'test.pdf',
        originalFilename: 'test.pdf',
        description: 'Test file',
        size: 0,
        content: undefined as any
      };

      service.downloadAttachment(attachment);

      expect(window.Blob).not.toHaveBeenCalled();
    });

    it('should use correct MIME type for different file extensions', () => {
      const testCases = [
        { filename: 'test.jpg', expectedMimeType: 'image/jpeg' },
        { filename: 'test.png', expectedMimeType: 'image/png' },
        { filename: 'test.txt', expectedMimeType: 'text/plain' },
        { filename: 'test.unknown', expectedMimeType: 'application/octet-stream' }
      ];

      testCases.forEach(testCase => {
        const attachment: AttachmentInfo = {
          filename: testCase.filename,
          originalFilename: testCase.filename,
          description: 'Test file',
          size: 100,
          content: new Uint8Array([1, 2, 3])
        };

        service.downloadAttachment(attachment);

        expect(window.Blob).toHaveBeenCalledWith([attachment.content], { type: testCase.expectedMimeType });
      });
    });
  });

  describe('ensureFileExtension', () => {
    it('should preserve existing file extension', () => {
      const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const result = (service as any).ensureFileExtension('document.pdf', content);

      expect(result).toBe('document.pdf');
    });

    it('should add detected extension to file without extension', () => {
      const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF signature
      const result = (service as any).ensureFileExtension('document', content);

      expect(result).toBe('document.pdf');
    });

    it('should add .bin extension for unrecognized content', () => {
      const content = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const result = (service as any).ensureFileExtension('unknown', content);

      expect(result).toBe('unknown.bin');
    });

    it('should add .bin extension for empty content', () => {
      const content = new Uint8Array([]);
      const result = (service as any).ensureFileExtension('empty', content);

      expect(result).toBe('empty.bin');
    });

    it('should add .bin extension for null content', () => {
      const result = (service as any).ensureFileExtension('null_content', null);

      expect(result).toBe('null_content.bin');
    });

    it('should add .bin extension for content too short for detection', () => {
      const content = new Uint8Array([0x25, 0x50]); // Too short for PDF detection
      const result = (service as any).ensureFileExtension('short', content);

      expect(result).toBe('short.bin');
    });
  });

  describe('detectFileType', () => {
    it('should detect PDF files', () => {
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const result = (service as any).detectFileType(pdfContent);

      expect(result.extension).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should detect JPEG files', () => {
      const jpegContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = (service as any).detectFileType(jpegContent);

      expect(result.extension).toBe('jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should detect PNG files', () => {
      const pngContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const result = (service as any).detectFileType(pngContent);

      expect(result.extension).toBe('png');
      expect(result.mimeType).toBe('image/png');
    });

    it('should detect GIF files', () => {
      const gifContent = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const result = (service as any).detectFileType(gifContent);

      expect(result.extension).toBe('gif');
      expect(result.mimeType).toBe('image/gif');
    });

    it('should detect MP3 files', () => {
      const mp3Content = new Uint8Array([0xFF, 0xFB, 0x90, 0x00]);
      const result = (service as any).detectFileType(mp3Content);

      expect(result.extension).toBe('mp3');
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('should detect ZIP files', () => {
      const zipContent = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const result = (service as any).detectFileType(zipContent);

      expect(result.extension).toBe('zip');
      expect(result.mimeType).toBe('application/zip');
    });

    it('should return default for unknown files', () => {
      const unknownContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const result = (service as any).detectFileType(unknownContent);

      expect(result.extension).toBe('bin');
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('matchesSignature', () => {
    it('should match exact signature', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]);
      const signature = [0x25, 0x50, 0x44, 0x46];
      const result = (service as any).matchesSignature(bytes, signature);

      expect(result).toBe(true);
    });

    it('should not match different signature', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x47]);
      const signature = [0x25, 0x50, 0x44, 0x46];
      const result = (service as any).matchesSignature(bytes, signature);

      expect(result).toBe(false);
    });

    it('should not match when bytes are too short', () => {
      const bytes = new Uint8Array([0x25, 0x50]);
      const signature = [0x25, 0x50, 0x44, 0x46];
      const result = (service as any).matchesSignature(bytes, signature);

      expect(result).toBe(false);
    });

    it('should match when bytes are longer than signature', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x00, 0x00]);
      const signature = [0x25, 0x50, 0x44, 0x46];
      const result = (service as any).matchesSignature(bytes, signature);

      expect(result).toBe(true);
    });
  });

  describe('detectLegacyOfficeFormat', () => {
    it('should detect Word documents', () => {
      const wordContent = new Uint8Array(1000);
      const wordString = 'Word.Document';
      for (let i = 0; i < wordString.length; i++) {
        wordContent[i] = wordString.charCodeAt(i);
      }

      const result = (service as any).detectLegacyOfficeFormat(wordContent);

      expect(result.extension).toBe('doc');
      expect(result.mimeType).toBe('application/msword');
    });

    it('should detect Excel documents', () => {
      const excelContent = new Uint8Array(1000);
      const excelString = 'Excel';
      for (let i = 0; i < excelString.length; i++) {
        excelContent[i] = excelString.charCodeAt(i);
      }

      const result = (service as any).detectLegacyOfficeFormat(excelContent);

      expect(result.extension).toBe('xls');
      expect(result.mimeType).toBe('application/vnd.ms-excel');
    });

    it('should detect PowerPoint documents', () => {
      const pptContent = new Uint8Array(1000);
      const pptString = 'PowerPoint';
      for (let i = 0; i < pptString.length; i++) {
        pptContent[i] = pptString.charCodeAt(i);
      }

      const result = (service as any).detectLegacyOfficeFormat(pptContent);

      expect(result.extension).toBe('ppt');
      expect(result.mimeType).toBe('application/vnd.ms-powerpoint');
    });

    it('should return default OLE format for unrecognized content', () => {
      const oleContent = new Uint8Array(1000);
      const result = (service as any).detectLegacyOfficeFormat(oleContent);

      expect(result.extension).toBe('ole');
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('detectZipBasedFormat', () => {
    it('should detect Excel XLSX files', () => {
      const xlsxContent = new Uint8Array(1000);
      const xlsxString = 'xl/workbook.xml';
      for (let i = 0; i < xlsxString.length; i++) {
        xlsxContent[i] = xlsxString.charCodeAt(i);
      }

      const result = (service as any).detectZipBasedFormat(xlsxContent);

      expect(result.extension).toBe('xlsx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should detect Word DOCX files', () => {
      const docxContent = new Uint8Array(1000);
      const docxString = 'word/document.xml';
      for (let i = 0; i < docxString.length; i++) {
        docxContent[i] = docxString.charCodeAt(i);
      }

      const result = (service as any).detectZipBasedFormat(docxContent);

      expect(result.extension).toBe('docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should detect PowerPoint PPTX files', () => {
      const pptxContent = new Uint8Array(1000);
      const pptxString = 'ppt/presentation.xml';
      for (let i = 0; i < pptxString.length; i++) {
        pptxContent[i] = pptxString.charCodeAt(i);
      }

      const result = (service as any).detectZipBasedFormat(pptxContent);

      expect(result.extension).toBe('pptx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    it('should detect JAR files', () => {
      const jarContent = new Uint8Array(1000);
      const jarString = 'META-INF/MANIFEST.MF';
      for (let i = 0; i < jarString.length; i++) {
        jarContent[i] = jarString.charCodeAt(i);
      }

      const result = (service as any).detectZipBasedFormat(jarContent);

      expect(result.extension).toBe('jar');
      expect(result.mimeType).toBe('application/java-archive');
    });

    it('should detect APK files', () => {
      const apkContent = new Uint8Array(1000);
      const apkString = 'AndroidManifest.xml';
      for (let i = 0; i < apkString.length; i++) {
        apkContent[i] = apkString.charCodeAt(i);
      }

      const result = (service as any).detectZipBasedFormat(apkContent);

      expect(result.extension).toBe('apk');
      expect(result.mimeType).toBe('application/vnd.android.package-archive');
    });

    it('should return true for regular ZIP files', () => {
      const zipContent = new Uint8Array(1000);
      const result = (service as any).detectZipBasedFormat(zipContent);

      expect(result).toBe(true);
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME type for known extensions', () => {
      const testCases = [
        { filename: 'test.pdf', expected: 'application/pdf' },
        { filename: 'test.jpg', expected: 'image/jpeg' },
        { filename: 'test.png', expected: 'image/png' },
        { filename: 'test.txt', expected: 'text/plain' },
        { filename: 'test.html', expected: 'text/html' },
        { filename: 'test.css', expected: 'text/css' },
        { filename: 'test.js', expected: 'application/javascript' },
        { filename: 'test.mp3', expected: 'audio/mpeg' },
        { filename: 'test.mp4', expected: 'video/mp4' }
      ];

      testCases.forEach(testCase => {
        const result = (service as any).getMimeTypeFromExtension(testCase.filename);
        expect(result).toBe(testCase.expected);
      });
    });

    it('should return default MIME type for unknown extensions', () => {
      const result = (service as any).getMimeTypeFromExtension('test.unknown');
      expect(result).toBe('application/octet-stream');
    });

    it('should handle files without extension', () => {
      const result = (service as any).getMimeTypeFromExtension('noextension');
      expect(result).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', () => {
      const result = (service as any).getMimeTypeFromExtension('test.PDF');
      expect(result).toBe('application/pdf');
    });

    it('should handle empty filename', () => {
      const result = (service as any).getMimeTypeFromExtension('');
      expect(result).toBe('application/octet-stream');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1)).toBe('1 Bytes');
      expect(service.formatFileSize(999)).toBe('999 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
      expect(service.formatFileSize(1023 * 1024)).toBe('1023 KB');
    });

    it('should format megabytes correctly', () => {
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(service.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(service.formatFileSize(1023 * 1024 * 1024)).toBe('1023 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(service.formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should handle decimal precision', () => {
      expect(service.formatFileSize(1234)).toBe('1.21 KB');
      expect(service.formatFileSize(1234567)).toBe('1.18 MB');
      expect(service.formatFileSize(1234567890)).toBe('1.15 GB');
    });

    it('should handle very large numbers', () => {
      const largeNumber = 1024 * 1024 * 1024 * 1024; // 1 TB (will be treated as GB)
      const result = service.formatFileSize(largeNumber);
      expect(result).toContain('GB');
    });
  });

  describe('File Signature Validation', () => {
    it('should detect WAV files with validator', () => {
      // Create WAV file signature: RIFF + WAVE
      const wavContent = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45  // WAVE
      ]);

      const result = (service as any).detectFileType(wavContent);

      expect(result.extension).toBe('wav');
      expect(result.mimeType).toBe('audio/wav');
    });

    it('should detect AVI files with validator', () => {
      // Create AVI file signature: RIFF + AVI
      const aviContent = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x41, 0x56, 0x49, 0x00  // AVI
      ]);

      const result = (service as any).detectFileType(aviContent);

      expect(result.extension).toBe('avi');
      expect(result.mimeType).toBe('video/x-msvideo');
    });

    it('should fall back to default when validator returns false', () => {
      // Create RIFF file that doesn't match WAV or AVI
      const riffContent = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x58, 0x58, 0x58, 0x58  // Unknown format
      ]);

      const result = (service as any).detectFileType(riffContent);

      expect(result.extension).toBe('bin');
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('Complex File Type Detection', () => {
    it('should handle OLE files with validator', () => {
      // Create OLE file with Word.Document signature
      const oleContent = new Uint8Array(1000);
      oleContent[0] = 0xD0;
      oleContent[1] = 0xCF;
      oleContent[2] = 0x11;
      oleContent[3] = 0xE0;
      
      const wordString = 'Word.Document';
      for (let i = 0; i < wordString.length; i++) {
        oleContent[100 + i] = wordString.charCodeAt(i);
      }

      const result = (service as any).detectFileType(oleContent);

      expect(result.extension).toBe('doc');
      expect(result.mimeType).toBe('application/msword');
    });

    it('should handle ZIP files with DOCX content', () => {
      // Create ZIP file with DOCX content
      const zipContent = new Uint8Array(1000);
      zipContent[0] = 0x50;
      zipContent[1] = 0x4B;
      
      const docxString = 'word/document.xml';
      for (let i = 0; i < docxString.length; i++) {
        zipContent[100 + i] = docxString.charCodeAt(i);
      }

      const result = (service as any).detectFileType(zipContent);

      expect(result.extension).toBe('docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty byte arrays', () => {
      const emptyContent = new Uint8Array([]);
      const result = (service as any).detectFileType(emptyContent);

      expect(result.extension).toBe('bin');
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should handle single byte arrays', () => {
      const singleByte = new Uint8Array([0x25]);
      const result = (service as any).detectFileType(singleByte);

      expect(result.extension).toBe('bin');
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should handle null content in ensureFileExtension', () => {
      const result = (service as any).ensureFileExtension('test', null);
      expect(result).toBe('test.bin');
    });

    it('should handle undefined content in ensureFileExtension', () => {
      const result = (service as any).ensureFileExtension('test', undefined);
      expect(result).toBe('test.bin');
    });
  });
});
