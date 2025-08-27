# Vanilla PDF.js Component

This component demonstrates how to implement a full-featured PDF viewer using the vanilla PDF.js library without any third-party Angular wrappers.

## Overview

The Vanilla PDF.js component provides:
- PDF rendering with canvas
- Text layer for text selection
- Search functionality with highlighting
- Thumbnail navigation
- Single page and continuous scroll modes
- Zoom controls
- Page navigation

## How PDF Rendering Works

### Understanding PDF Structure

PDF (Portable Document Format) files contain vector graphics, text, and images defined in a page description language. Unlike HTML or images, PDFs cannot be directly displayed in web browsers without conversion to a renderable format.

### Why Canvas is Required

**Canvas as a Rendering Target:**
- PDFs contain vector graphics (lines, curves, shapes) and text positioned with precise coordinates
- Canvas provides a 2D drawing context that can render these vector elements as pixels
- Canvas supports the drawing operations needed: paths, fills, strokes, text rendering, and image drawing

**Browser Limitations:**
- Browsers cannot natively interpret PDF page descriptions
- Canvas acts as a "virtual paper" where PDF content is drawn pixel by pixel
- Each PDF page becomes a canvas image that browsers can display

### PDF.js Rendering Pipeline

```
PDF File → PDF.js Parser → Page Objects → Canvas Context → Rendered Image
```

1. **PDF Parsing**: PDF.js reads and parses the PDF binary format
2. **Page Extraction**: Each page is converted to a renderable object with drawing commands
3. **Viewport Calculation**: Page dimensions are scaled and rotated based on user settings
4. **Canvas Rendering**: Drawing commands are executed on the canvas 2D context
5. **Text Layer Generation**: Text positioning data is extracted for selection and search

### Canvas vs. Other Approaches

**Canvas Advantages:**
- Pixel-perfect rendering that matches the original PDF
- Supports complex graphics, gradients, and transparency
- Hardware-accelerated on modern browsers
- Can handle any PDF content (vector graphics, embedded fonts, images)

**Alternative Approaches:**
- **SVG**: Limited support for complex PDF features, performance issues with large documents
- **HTML/CSS**: Cannot accurately represent PDF layouts and typography
- **Images**: Static, no text selection, large file sizes

### Memory and Performance Considerations

**Canvas Memory Usage:**
- Each rendered page consumes memory based on canvas size (width × height × 4 bytes per pixel)
- High-resolution pages can use significant memory (e.g., 1920×1080 page ≈ 8MB)
- Multiple pages in continuous mode multiply memory requirements

**Rendering Performance:**
- Canvas drawing is GPU-accelerated on modern browsers
- Viewport calculations are optimized for smooth zooming and rotation
- Text layer rendering is done separately to avoid redrawing for search/selection

**Optimization Strategies:**
- Render pages on-demand to reduce memory usage
- Use appropriate scale factors (don't over-render)
- Cache rendered pages when memory allows
- Clear unused canvases in continuous scroll mode

## Deep Dive: PDF Rendering Architecture

### Core Components Explained

#### 1. Canvas Element
```typescript
@ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
canvas?: HTMLCanvasElement;
```

**What is Canvas:**
- An HTML5 element that provides a drawable 2D surface
- Acts as a bitmap/raster image where each pixel can be individually controlled
- Provides a JavaScript API for drawing shapes, text, and images

**Canvas Context (2D Rendering Context):**
```typescript
context?: CanvasRenderingContext2D;
this.context = this.canvas.getContext('2d');
```

**Context Functions:**
- The 2D context is the "paintbrush" that draws on the canvas
- Provides methods like `fillRect()`, `drawImage()`, `fillText()`, `stroke()`, etc.
- PDF.js uses this context to convert PDF vector commands to pixel operations

**Canvas Memory Model:**
```
Canvas (1920×1080) = 1920 × 1080 × 4 bytes = 8,294,400 bytes ≈ 8MB
Each pixel = 4 bytes (Red, Green, Blue, Alpha channels)
```

#### 2. Text Layer Element
```typescript
@ViewChild('textLayer', { static: false }) textLayerRef?: ElementRef<HTMLDivElement>;
textLayerElement?: HTMLDivElement;
```

**Purpose of Text Layer:**
- Canvas renders text as pixels (images), making text non-selectable
- Text layer creates invisible, positioned HTML spans over the canvas
- These spans contain the actual text content for selection and search

**Why Separate Text Layer:**
- **Canvas Limitation**: Text drawn on canvas becomes part of the image - not selectable
- **Accessibility**: Screen readers need actual text content, not images
- **Search Functionality**: Browsers can search through HTML text, not canvas pixels
- **Copy/Paste**: Users can select and copy text from HTML elements

### PDF Rendering Process in Detail

#### Step 1: PDF Document Parsing
```typescript
this.pdfDocument = await pdfjsLib.getDocument(this.pdfUrl).promise;
```

**What Happens:**
- PDF.js downloads and parses the PDF binary format
- Extracts page descriptions, fonts, images, and vector graphics
- Creates internal representation of each page's content
- **No rendering yet** - just data extraction and preparation

#### Step 2: Page Object Creation
```typescript
const page = await this.pdfDocument.getPage(pageNumber);
```

**Page Object Contains:**
- Vector drawing commands (lines, curves, fills)
- Text positioning and font information
- Embedded images and their positions
- Coordinate system and transformation matrices

#### Step 3: Viewport Calculation
```typescript
const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
```

**Viewport Purpose:**
- Converts PDF coordinate system to screen pixels
- Applies scaling (zoom) and rotation transformations
- Calculates final canvas dimensions needed

**Coordinate Transformation:**
```
PDF Coordinates → Viewport Transform → Screen Pixels
(72 DPI units)   → (scale, rotation) → (device pixels)
```

#### Step 4: Canvas Rendering
```typescript
const renderContext = {
  canvasContext: this.context,
  viewport: viewport
};
await page.render(renderContext).promise;
```

**Rendering Process:**
1. PDF.js translates PDF vector commands to canvas operations
2. Fills shapes, draws lines, renders embedded images
3. Applies fonts and draws text as pixels
4. **Result**: Visual representation of the PDF page

**Canvas Operations Used:**
- `fillRect()` for rectangles and backgrounds
- `stroke()` and `fill()` for vector paths
- `drawImage()` for embedded images
- `fillText()` for text rendering (as pixels)

#### Step 5: Text Layer Creation
```typescript
const textContent = await page.getTextContent();
await this.renderTextLayer(page, viewport);
```

**Text Content Extraction:**
- PDF.js analyzes the page and extracts text separately
- Provides text strings with exact positioning coordinates
- Includes font size, style, and transformation data

**Text Layer Rendering:**
```typescript
textContent.items.forEach((item: any) => {
  const textSpan = document.createElement('span');
  
  // Position calculation
  const transform = item.transform;
  const x = transform[4] * viewport.scale;
  const y = viewport.height - transform[5] * viewport.scale;
  
  // Styling for invisible overlay
  textSpan.style.position = 'absolute';
  textSpan.style.left = x + 'px';
  textSpan.style.top = (y - item.height * viewport.scale * 0.8) + 'px';
  textSpan.style.fontSize = (item.height * viewport.scale * 0.91) + 'px';
  textSpan.style.color = 'transparent'; // Invisible but selectable
  
  textSpan.textContent = item.str;
  this.textLayerElement.appendChild(textSpan);
});
```

### Text Selection vs. OCR

#### Text Selection (What We Use)
**How it Works:**
- PDF already contains text information stored digitally
- Text was created with text tools, not scanned from images
- PDF.js extracts this existing text data with positioning
- No image analysis or character recognition needed

**Advantages:**
- Perfect accuracy (original text is preserved)
- Maintains formatting and font information
- Very fast - no processing required
- Preserves special characters and Unicode

#### OCR (Optical Character Recognition)
**When OCR is Needed:**
- Scanned documents (PDF contains only images)
- Images embedded within PDFs
- Historical documents converted to PDF

**OCR Process:**
1. Convert PDF page to image
2. Analyze image for text regions
3. Recognize individual characters using ML models
4. Reconstruct text with estimated positions

**OCR Limitations:**
- Lower accuracy than native text
- Slower processing
- May miss formatting
- Requires additional libraries (Tesseract.js)

### Transform Matrices Explained

#### PDF Coordinate System
```typescript
const transform = item.transform; // [a, b, c, d, e, f]
```

**Matrix Components:**
- `a` (transform[0]): Horizontal scaling
- `b` (transform[1]): Horizontal skewing
- `c` (transform[2]): Vertical skewing  
- `d` (transform[3]): Vertical scaling
- `e` (transform[4]): Horizontal translation (X position)
- `f` (transform[5]): Vertical translation (Y position)

**Common Usage:**
```typescript
const x = transform[4] * viewport.scale; // X position
const y = transform[5] * viewport.scale; // Y position
const scaleX = Math.abs(transform[0]);   // Width scaling
const scaleY = Math.abs(transform[3]);   // Height scaling
```

**Coordinate Conversion:**
```typescript
// PDF uses bottom-left origin, Canvas uses top-left
const canvasY = viewport.height - (pdfY * viewport.scale);
```

### Memory Architecture

#### Canvas Memory
```
Single Page Canvas:
- Width: 800px, Height: 1000px
- Memory: 800 × 1000 × 4 = 3.2MB per page
- RGBA: Red, Green, Blue, Alpha (1 byte each)
```

#### Text Layer Memory
```
Text Layer (DOM Elements):
- ~50-200 text spans per page
- Each span: ~100-500 bytes
- Total: ~10-100KB per page (much lighter than canvas)
```

#### Continuous Scroll Memory
```
10-page Document:
- Canvas: 10 × 3.2MB = 32MB
- Text Layer: 10 × 50KB = 500KB
- Total: ~32.5MB for full document
```

This architecture allows PDF.js to provide pixel-perfect rendering while maintaining text selectability and search functionality through the dual-layer approach.

## PDF.js Library Setup

### 1. Installation

```bash
yarn add pdfjs-dist
```

### 2. Worker Configuration

PDF.js requires a web worker for PDF processing. Configure the worker path:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
```

### 3. Loading a PDF Document

```typescript
async loadPdf() {
  try {
    this.isLoading = true;
    
    // Load PDF document
    this.pdfDocument = await pdfjsLib.getDocument(this.pdfUrl).promise;
    this.totalPages = this.pdfDocument.numPages;
    
    // Start rendering
    await this.waitForCanvasAndRender();
  } catch (error) {
    console.error('Error loading PDF:', error);
    this.error = 'Failed to load PDF';
  } finally {
    this.isLoading = false;
  }
}
```

## Canvas Rendering

### 1. Basic Page Rendering

```typescript
async renderPage(pageNumber: number) {
  if (!this.pdfDocument || !this.canvas || !this.context) return;

  try {
    // Get the page
    const page = await this.pdfDocument.getPage(pageNumber);
    
    // Calculate viewport with scale
    const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
    
    // Set canvas dimensions
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    
    // Render the page
    const renderContext = {
      canvasContext: this.context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Render text layer for selection
    await this.renderTextLayer(page, viewport);
    
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}
```

### 2. Viewport and Scaling

```typescript
// Create viewport with custom scale and rotation
const viewport = page.getViewport({ 
  scale: this.scale,     // Zoom level (1.0 = 100%)
  rotation: this.rotation // Rotation in degrees (0, 90, 180, 270)
});

// Canvas dimensions match viewport
this.canvas.width = viewport.width;
this.canvas.height = viewport.height;
```

## Text Layer Implementation

The text layer enables text selection and highlighting:

### 1. Text Layer Structure

```typescript
async renderTextLayer(page: any, viewport: any) {
  if (!this.textLayerRef?.nativeElement) return;

  try {
    // Clear existing text layer
    this.textLayerRef.nativeElement.innerHTML = '';
    
    // Get text content from PDF
    const textContent = await page.getTextContent();
    
    // Create text spans for each text item
    textContent.items.forEach((item: any) => {
      const textSpan = document.createElement('span');
      
      // Position text span
      const transform = item.transform;
      const x = transform[4] * viewport.scale;
      const y = viewport.height - transform[5] * viewport.scale;
      
      // Apply styles
      textSpan.style.position = 'absolute';
      textSpan.style.left = x + 'px';
      textSpan.style.top = (y - item.height * viewport.scale * 0.8) + 'px';
      textSpan.style.fontSize = (item.height * viewport.scale * 0.91) + 'px';
      textSpan.style.color = 'transparent'; // Invisible but selectable
      
      textSpan.textContent = item.str;
      this.textLayerRef.nativeElement.appendChild(textSpan);
    });
  } catch (error) {
    console.error('Error rendering text layer:', error);
  }
}
```

### 2. Text Positioning

PDF.js provides transform matrices for text positioning:

```typescript
const transform = item.transform;
// transform[4] = x position
// transform[5] = y position
// transform[0] = horizontal scaling
// transform[3] = vertical scaling

const x = transform[4] * viewport.scale;
const y = viewport.height - transform[5] * viewport.scale;
```

## Search Functionality

### 1. Text Search Implementation

```typescript
async performSearch() {
  if (!this.searchText.trim() || !this.pdfDocument) return;

  this.isSearching = true;
  this.searchResults = [];
  this.highlightedResults = [];

  try {
    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      const page = await this.pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract page text
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      // Search with regex
      const searchRegex = new RegExp(
        this.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
        'gi'
      );
      const matches = [...pageText.matchAll(searchRegex)];

      if (matches.length > 0) {
        // Find text items to highlight
        const pageHighlights = this.findTextItemsForHighlight(
          textContent.items, 
          this.searchText, 
          pageNum
        );
        this.highlightedResults.push(...pageHighlights);
        
        // Store search results
        matches.forEach((match, index) => {
          this.searchResults.push({
            pageNumber: pageNum,
            matchIndex: index,
            text: match[0],
            startIndex: match.index,
            context: this.getContext(pageText, match.index || 0, 100)
          });
        });
      }
    }

    if (this.searchResults.length > 0) {
      await this.goToSearchResult(0);
    }
  } catch (error) {
    console.error('Error during search:', error);
  } finally {
    this.isSearching = false;
  }
}
```

### 2. Text Highlighting

```typescript
// Find text items that contain search term
private findTextItemsForHighlight(textItems: any[], searchText: string, pageNumber: number): any[] {
  const highlights: any[] = [];
  const searchLower = searchText.toLowerCase().trim();
  
  textItems.forEach((item, index) => {
    const itemText = item.str.toLowerCase().trim();
    
    if (itemText.includes(searchLower)) {
      highlights.push({
        pageNumber: pageNumber,
        textItem: item,
        itemIndex: index,
        searchText: searchText,
        matchText: item.str
      });
    }
  });
  
  return highlights;
}

// Apply highlighting during text layer rendering
if (shouldHighlight || forceHighlight) {
  textSpan.style.backgroundColor = '#00FF00'; // Green background
  textSpan.style.color = '#000000'; // Black text
  textSpan.style.border = '2px solid #FF0000'; // Red border
  textSpan.style.fontWeight = 'bold';
  textSpan.style.borderRadius = '3px';
}
```

## Thumbnail Generation

```typescript
async generateThumbnails() {
  if (!this.pdfDocument) return;
  
  this.thumbnails = [];
  
  for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
    const page = await this.pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.15 }); // Small scale for thumbnails
    
    // Create thumbnail canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    if (context) {
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert to data URL
      this.thumbnails.push({
        pageNumber: pageNum,
        dataUrl: canvas.toDataURL(),
        width: viewport.width,
        height: viewport.height
      });
    }
  }
}
```

## Continuous Scroll Mode

### 1. Rendering All Pages

```typescript
async renderAllPages() {
  if (!this.pdfDocument || !this.canvas || !this.context) return;

  // Calculate total height needed
  let totalHeight = 0;
  const pageHeights: number[] = [];
  
  for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
    const page = await this.pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });
    pageHeights.push(viewport.height);
    totalHeight += viewport.height + 20; // Add gap between pages
  }

  // Set canvas size
  const firstPage = await this.pdfDocument.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: this.scale });
  this.canvas.width = firstViewport.width;
  this.canvas.height = totalHeight;

  // Clear text layer
  if (this.textLayerRef?.nativeElement) {
    this.textLayerRef.nativeElement.innerHTML = '';
  }

  // Render each page
  let currentY = 0;
  this.pagePositions = [];

  for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
    const page = await this.pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });
    
    // Store page position for navigation
    this.pagePositions.push({
      pageNumber: pageNum,
      top: currentY,
      bottom: currentY + viewport.height
    });

    // Render page at specific position
    const renderContext = {
      canvasContext: this.context,
      viewport: viewport,
      transform: [1, 0, 0, 1, 0, currentY] // Translate to position
    };
    
    await page.render(renderContext).promise;
    
    // Render text layer for this page
    await this.renderTextLayerManual(page, viewport, 0, currentY);
    
    currentY += viewport.height + 20; // Move to next page position
  }
}
```

### 2. Scroll-based Page Detection

```typescript
@HostListener('window:scroll', ['$event'])
onScroll() {
  if (!this.continuousScroll || this.pagePositions.length === 0) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const viewportCenter = scrollTop + windowHeight / 2;

  // Find the page at the center of viewport
  for (const pagePos of this.pagePositions) {
    if (viewportCenter >= pagePos.top && viewportCenter <= pagePos.bottom) {
      if (this.currentPage !== pagePos.pageNumber) {
        this.currentPage = pagePos.pageNumber;
        this.updateThumbnailHighlight();
      }
      break;
    }
  }
}
```

## Component Architecture

### 1. Key Properties

```typescript
export class VanillaPdfjsComponent {
  // PDF.js objects
  pdfDocument?: any;
  renderTask?: any;
  
  // Canvas elements
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('textLayer', { static: false }) textLayerRef?: ElementRef<HTMLDivElement>;
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  
  // State
  currentPage = 1;
  totalPages = 0;
  scale = 1.5;
  rotation = 0;
  isLoading = false;
  error: string | null = null;
  
  // UI modes
  showThumbnails = false;
  continuousScroll = false;
  
  // Search
  searchText = '';
  searchResults: any[] = [];
  highlightedResults: any[] = [];
  isSearching = false;
  currentSearchIndex = 0;
  
  // Navigation
  thumbnails: any[] = [];
  pagePositions: Array<{pageNumber: number, top: number, bottom: number}> = [];
}
```

### 2. Lifecycle Methods

```typescript
ngOnInit() {
  this.loadPdf();
}

ngAfterViewInit() {
  // Canvas and text layer are available here
  this.initializeCanvas();
}

ngOnDestroy() {
  // Clean up PDF document
  if (this.pdfDocument) {
    this.pdfDocument.destroy();
  }
}
```

## Error Handling

```typescript
try {
  // PDF operations
  const page = await this.pdfDocument.getPage(pageNumber);
  // ... rendering logic
} catch (error) {
  console.error('PDF operation failed:', error);
  this.error = 'Failed to render page';
  
  // Provide fallback or retry logic
  if (error.name === 'PasswordException') {
    this.error = 'PDF is password protected';
  } else if (error.name === 'InvalidPDFException') {
    this.error = 'Invalid PDF file';
  } else {
    this.error = 'Error loading PDF';
  }
}
```

## Performance Considerations

1. **Memory Management**: Destroy PDF documents when done
2. **Lazy Loading**: Render pages on demand in continuous mode
3. **Canvas Reuse**: Reuse canvas elements when possible
4. **Text Layer Optimization**: Clear and rebuild text layers efficiently
5. **Thumbnail Caching**: Cache thumbnail images to avoid re-rendering

## Browser Support

- Modern browsers with Canvas support
- WebAssembly support for PDF.js
- ES6 modules support

## Dependencies

- `pdfjs-dist`: Core PDF.js library
- `@angular/core`: Angular framework
- `@angular/common`: Angular common utilities

This implementation provides a complete PDF viewing solution with all modern features expected in a PDF viewer.
