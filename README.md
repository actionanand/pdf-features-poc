# PDF Application Demo

This is a comprehensive PDF search application built with Angular that demonstrates different PDF libraries and their capabilities for searching text within PDF documents.

## Features

### 🔍 Text Search
- Search for any text within PDF documents (default: "hello cortellis")
- Programmatic search functionality that can be dynamically changed
- Highlighted search results on PDF pages
- Search result count and page navigation

### 📄 PDF Libraries Comparison

#### 1. ng2-pdf-viewer (~8MB)
- **Path**: `/ng2-pdf-viewer`
- **Features**: Basic PDF rendering, search, zoom controls
- **Pros**: Easy to implement, good community support
- **Cons**: Limited customization, larger bundle size

#### 2. PDF.js Direct Implementation (~3MB)
- **Path**: `/pdfjs-direct`
- **Features**: Custom implementation with full control
- **Pros**: Lightweight, highly customizable, advanced search
- **Cons**: More complex implementation

#### 3. PDF-lib + PDF.js (~5MB)
- **Path**: `/pdf-lib`
- **Features**: PDF manipulation + rendering, metadata extraction
- **Pros**: Can modify PDFs, extract metadata, download with highlights
- **Cons**: Larger size, more complex

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
yarn install
# or
npm install

# Start the development server
yarn start
# or
npm start
```

## 📦 Bundle Sizes

| Library | Bundle Size | Features |
|---------|-------------|----------|
| ng2-pdf-viewer | ~8MB | Basic rendering, search |
| PDF.js Direct | ~3MB | Custom implementation |
| PDF-lib + PDF.js | ~5MB | Advanced manipulation |
