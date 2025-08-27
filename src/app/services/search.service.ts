import { Injectable } from '@angular/core';
import { PdfViewerComponent } from 'ng2-pdf-viewer';

export interface SearchState {
  searchText: string;
  hasSearchResults: boolean;
  searchResultsInfo: string;
  currentSearchMatchIndex: number;
  totalSearchMatches: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  
  private searchState: SearchState = {
    searchText: '',
    hasSearchResults: false,
    searchResultsInfo: '',
    currentSearchMatchIndex: 0,
    totalSearchMatches: 0
  };

  constructor() {}

  getSearchState(): SearchState {
    return { ...this.searchState };
  }

  updateSearchText(text: string): void {
    this.searchState.searchText = text;
  }

  clearSearch(): SearchState {
    this.searchState = {
      searchText: '',
      hasSearchResults: false,
      searchResultsInfo: '',
      currentSearchMatchIndex: 0,
      totalSearchMatches: 0
    };
    return { ...this.searchState };
  }

  updateSearchResults(matchesCount: any): SearchState {
    if (matchesCount) {
      this.searchState.totalSearchMatches = matchesCount.total || 0;
      this.searchState.currentSearchMatchIndex = matchesCount.current || 0;
      
      if (this.searchState.totalSearchMatches > 0) {
        this.searchState.hasSearchResults = true;
        if (this.searchState.totalSearchMatches === 1) {
          this.searchState.searchResultsInfo = `1 match found`;
        } else {
          this.searchState.searchResultsInfo = `${this.searchState.totalSearchMatches} matches found`;
        }
      } else {
        this.searchState.hasSearchResults = false;
        this.searchState.searchResultsInfo = 'No matches found';
      }
    } else {
      this.searchState.hasSearchResults = false;
      this.searchState.searchResultsInfo = 'No matches found';
      this.searchState.totalSearchMatches = 0;
      this.searchState.currentSearchMatchIndex = 0;
    }
    
    console.log('Updated search state:', this.searchState);
    return { ...this.searchState };
  }

  setSearchingState(): SearchState {
    this.searchState.searchResultsInfo = 'Searching...';
    this.searchState.hasSearchResults = false;
    // Don't clear searchText here - keep it preserved
    return { ...this.searchState };
  }

  performSearch(pdfComponent: PdfViewerComponent, searchText: string): void {
    if (!pdfComponent) {
      console.warn('PDF component not ready yet');
      return;
    }

    // Trim and normalize search text
    const normalizedSearchText = searchText.trim();
    if (!normalizedSearchText) {
      console.warn('Empty search text provided');
      return;
    }

    // Clear any existing search first
    pdfComponent.eventBus.dispatch('find', {
      query: '', 
      type: 'find', 
      caseSensitive: false, 
      findPrevious: undefined, 
      highlightAll: false, 
      phraseSearch: true
    });

    // Small delay to ensure clear is processed, then perform new search
    setTimeout(() => {
      pdfComponent.eventBus.dispatch('find', {
        query: normalizedSearchText, 
        type: 'find', // Use 'find' for initial search
        caseSensitive: false, 
        findPrevious: undefined, 
        highlightAll: true, 
        phraseSearch: true,
        entireWord: false
      });
    }, 100);
  }

  findNext(pdfComponent: PdfViewerComponent): void {
    if (!pdfComponent || !this.searchState.hasSearchResults) return;
    
    pdfComponent.eventBus.dispatch('find', {
      query: this.searchState.searchText, 
      type: 'again', 
      caseSensitive: false, 
      findPrevious: false, 
      highlightAll: true, 
      phraseSearch: true,
      entireWord: false
    });
  }

  findPrevious(pdfComponent: PdfViewerComponent): void {
    if (!pdfComponent || !this.searchState.hasSearchResults) return;
    
    pdfComponent.eventBus.dispatch('find', {
      query: this.searchState.searchText, 
      type: 'again', 
      caseSensitive: false, 
      findPrevious: true, 
      highlightAll: true, 
      phraseSearch: true,
      entireWord: false
    });
  }

  clearSearchHighlights(pdfComponent: PdfViewerComponent): void {
    if (!pdfComponent) return;
    
    // First dispatch a find with empty query to clear highlights
    pdfComponent.eventBus.dispatch('find', {
      query: '', 
      type: 'find', 
      caseSensitive: false, 
      findPrevious: undefined, 
      highlightAll: false, 
      phraseSearch: true
    });
    
    // Then dispatch findbarclose to ensure clean state
    setTimeout(() => {
      pdfComponent.eventBus.dispatch('findbarclose', {});
    }, 50);
  }
}
