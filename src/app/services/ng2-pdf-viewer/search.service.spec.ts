import { TestBed } from '@angular/core/testing';
import { SearchService, SearchState } from './search.service';
import { PdfViewerComponent } from 'ng2-pdf-viewer';

describe('SearchService', () => {
  let service: SearchService;
  let mockPdfComponent: jasmine.SpyObj<PdfViewerComponent>;
  let mockEventBus: jasmine.SpyObj<any>;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = jasmine.createSpyObj('eventBus', ['dispatch']);

    // Create mock PDF component
    mockPdfComponent = jasmine.createSpyObj('PdfViewerComponent', [], {
      eventBus: mockEventBus
    });

    TestBed.configureTestingModule({
      providers: [SearchService]
    });
    service = TestBed.inject(SearchService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default search state', () => {
      const state = service.getSearchState();
      expect(state).toEqual({
        searchText: '',
        hasSearchResults: false,
        searchResultsInfo: '',
        currentSearchMatchIndex: 0,
        totalSearchMatches: 0
      });
    });
  });

  describe('getSearchState', () => {
    it('should return a copy of the search state', () => {
      const state1 = service.getSearchState();
      const state2 = service.getSearchState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be different objects
    });

    it('should return current state after modifications', () => {
      service.updateSearchText('test');
      const state = service.getSearchState();

      expect(state.searchText).toBe('test');
    });
  });

  describe('updateSearchText', () => {
    it('should update search text', () => {
      service.updateSearchText('hello world');
      const state = service.getSearchState();

      expect(state.searchText).toBe('hello world');
    });

    it('should handle empty string', () => {
      service.updateSearchText('');
      const state = service.getSearchState();

      expect(state.searchText).toBe('');
    });

    it('should handle special characters', () => {
      const specialText = 'test@#$%^&*()';
      service.updateSearchText(specialText);
      const state = service.getSearchState();

      expect(state.searchText).toBe(specialText);
    });

    it('should preserve whitespace', () => {
      const textWithSpaces = '  test  text  ';
      service.updateSearchText(textWithSpaces);
      const state = service.getSearchState();

      expect(state.searchText).toBe(textWithSpaces);
    });
  });

  describe('clearSearch', () => {
    it('should reset all search state properties', () => {
      // Set some non-default values
      service.updateSearchText('test');
      service.updateSearchResults({ total: 5, current: 2 });

      const state = service.clearSearch();

      expect(state).toEqual({
        searchText: '',
        hasSearchResults: false,
        searchResultsInfo: '',
        currentSearchMatchIndex: 0,
        totalSearchMatches: 0
      });
    });

    it('should return a copy of the cleared state', () => {
      const state = service.clearSearch();
      state.searchText = 'modified';

      const currentState = service.getSearchState();
      expect(currentState.searchText).toBe('');
    });
  });

  describe('updateSearchResults', () => {
    it('should update state with search results', () => {
      const matchesCount = { total: 5, current: 2 };
      const state = service.updateSearchResults(matchesCount);

      expect(state.totalSearchMatches).toBe(5);
      expect(state.currentSearchMatchIndex).toBe(2);
      expect(state.hasSearchResults).toBe(true);
      expect(state.searchResultsInfo).toBe('5 matches found');
    });

    it('should handle single match correctly', () => {
      const matchesCount = { total: 1, current: 1 };
      const state = service.updateSearchResults(matchesCount);

      expect(state.totalSearchMatches).toBe(1);
      expect(state.currentSearchMatchIndex).toBe(1);
      expect(state.hasSearchResults).toBe(true);
      expect(state.searchResultsInfo).toBe('1 match found');
    });

    it('should handle no matches', () => {
      const matchesCount = { total: 0, current: 0 };
      const state = service.updateSearchResults(matchesCount);

      expect(state.totalSearchMatches).toBe(0);
      expect(state.currentSearchMatchIndex).toBe(0);
      expect(state.hasSearchResults).toBe(false);
      expect(state.searchResultsInfo).toBe('No matches found');
    });

    it('should handle null matchesCount', () => {
      const state = service.updateSearchResults(null);

      expect(state.hasSearchResults).toBe(false);
      expect(state.searchResultsInfo).toBe('No matches found');
      expect(state.totalSearchMatches).toBe(0);
      expect(state.currentSearchMatchIndex).toBe(0);
    });

    it('should handle undefined matchesCount', () => {
      const state = service.updateSearchResults(undefined);

      expect(state.hasSearchResults).toBe(false);
      expect(state.searchResultsInfo).toBe('No matches found');
      expect(state.totalSearchMatches).toBe(0);
      expect(state.currentSearchMatchIndex).toBe(0);
    });

    it('should handle matchesCount with missing properties', () => {
      const state = service.updateSearchResults({});

      expect(state.totalSearchMatches).toBe(0);
      expect(state.currentSearchMatchIndex).toBe(0);
      expect(state.hasSearchResults).toBe(false);
      expect(state.searchResultsInfo).toBe('No matches found');
    });

    it('should handle partial matchesCount data', () => {
      const matchesCount = { total: 3 }; // missing current
      const state = service.updateSearchResults(matchesCount);

      expect(state.totalSearchMatches).toBe(3);
      expect(state.currentSearchMatchIndex).toBe(0);
      expect(state.hasSearchResults).toBe(true);
      expect(state.searchResultsInfo).toBe('3 matches found');
    });

    it('should log updated search state', () => {
      spyOn(console, 'log');
      const matchesCount = { total: 3, current: 1 };

      service.updateSearchResults(matchesCount);

      expect(console.log).toHaveBeenCalledWith('Updated search state:', jasmine.any(Object));
    });
  });

  describe('setSearchingState', () => {
    it('should set searching state correctly', () => {
      service.updateSearchText('test query');
      const state = service.setSearchingState();

      expect(state.searchResultsInfo).toBe('Searching...');
      expect(state.hasSearchResults).toBe(false);
      expect(state.searchText).toBe('test query'); // Should preserve search text
    });

    it('should preserve existing search text', () => {
      service.updateSearchText('important search');
      service.setSearchingState();
      const state = service.getSearchState();

      expect(state.searchText).toBe('important search');
    });

    it('should return a copy of the state', () => {
      const state = service.setSearchingState();
      state.searchResultsInfo = 'modified';

      const currentState = service.getSearchState();
      expect(currentState.searchResultsInfo).toBe('Searching...');
    });
  });

  describe('performSearch', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should dispatch clear and search events', () => {
      service.performSearch(mockPdfComponent, 'test query');

      // Check initial clear dispatch
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', {
        query: '',
        type: 'find',
        caseSensitive: false,
        findPrevious: undefined,
        highlightAll: false,
        phraseSearch: true
      });

      // Advance time to trigger the delayed search
      jasmine.clock().tick(100);

      // Check search dispatch
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', {
        query: 'test query',
        type: 'find',
        caseSensitive: false,
        findPrevious: undefined,
        highlightAll: true,
        phraseSearch: true,
        entireWord: false
      });

      expect(mockEventBus.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should trim search text before searching', () => {
      service.performSearch(mockPdfComponent, '  test query  ');

      jasmine.clock().tick(100);

      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', jasmine.objectContaining({
        query: 'test query'
      }));
    });

    it('should not search when PDF component is null', () => {
      spyOn(console, 'warn');

      service.performSearch(null as any, 'test');

      expect(console.warn).toHaveBeenCalledWith('PDF component not ready yet');
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not search when PDF component is undefined', () => {
      spyOn(console, 'warn');

      service.performSearch(undefined as any, 'test');

      expect(console.warn).toHaveBeenCalledWith('PDF component not ready yet');
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not search with empty string', () => {
      spyOn(console, 'warn');

      service.performSearch(mockPdfComponent, '');

      expect(console.warn).toHaveBeenCalledWith('Empty search text provided');
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not search with whitespace only', () => {
      spyOn(console, 'warn');

      service.performSearch(mockPdfComponent, '   ');

      expect(console.warn).toHaveBeenCalledWith('Empty search text provided');
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should handle special characters in search text', () => {
      const specialText = 'test@#$%^&*()';
      service.performSearch(mockPdfComponent, specialText);

      jasmine.clock().tick(100);

      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', jasmine.objectContaining({
        query: specialText
      }));
    });
  });

  describe('findNext', () => {
    it('should dispatch findNext event when search results exist', () => {
      // Set up state with search results
      service.updateSearchText('test');
      service.updateSearchResults({ total: 5, current: 1 });

      service.findNext(mockPdfComponent);

      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', {
        query: 'test',
        type: 'again',
        caseSensitive: false,
        findPrevious: false,
        highlightAll: true,
        phraseSearch: true,
        entireWord: false
      });
    });

    it('should not dispatch when no search results', () => {
      service.findNext(mockPdfComponent);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when PDF component is null', () => {
      service.updateSearchResults({ total: 5, current: 1 });

      service.findNext(null as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when PDF component is undefined', () => {
      service.updateSearchResults({ total: 5, current: 1 });

      service.findNext(undefined as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('findPrevious', () => {
    it('should dispatch findPrevious event when search results exist', () => {
      // Set up state with search results
      service.updateSearchText('test');
      service.updateSearchResults({ total: 5, current: 3 });

      service.findPrevious(mockPdfComponent);

      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', {
        query: 'test',
        type: 'again',
        caseSensitive: false,
        findPrevious: true,
        highlightAll: true,
        phraseSearch: true,
        entireWord: false
      });
    });

    it('should not dispatch when no search results', () => {
      service.findPrevious(mockPdfComponent);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when PDF component is null', () => {
      service.updateSearchResults({ total: 5, current: 1 });

      service.findPrevious(null as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when PDF component is undefined', () => {
      service.updateSearchResults({ total: 5, current: 1 });

      service.findPrevious(undefined as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('clearSearchHighlights', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should dispatch clear events in sequence', () => {
      service.clearSearchHighlights(mockPdfComponent);

      // Check initial clear dispatch
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', {
        query: '',
        type: 'find',
        caseSensitive: false,
        findPrevious: undefined,
        highlightAll: false,
        phraseSearch: true
      });

      // Advance time to trigger the delayed findbarclose
      jasmine.clock().tick(50);

      // Check findbarclose dispatch
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('findbarclose', {});

      expect(mockEventBus.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should not dispatch when PDF component is null', () => {
      service.clearSearchHighlights(null as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when PDF component is undefined', () => {
      service.clearSearchHighlights(undefined as any);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should handle complete search workflow', () => {
      // Start search
      service.updateSearchText('test query');
      service.setSearchingState();
      
      let state = service.getSearchState();
      expect(state.searchResultsInfo).toBe('Searching...');

      // Perform search
      service.performSearch(mockPdfComponent, 'test query');
      jasmine.clock().tick(100);

      // Update with results
      state = service.updateSearchResults({ total: 3, current: 1 });
      expect(state.hasSearchResults).toBe(true);
      expect(state.searchResultsInfo).toBe('3 matches found');

      // Navigate results
      service.findNext(mockPdfComponent);
      service.findPrevious(mockPdfComponent);

      // Clear search
      service.clearSearchHighlights(mockPdfComponent);
      jasmine.clock().tick(50);

      // Final clear
      service.clearSearch();
      state = service.getSearchState();
      expect(state.searchText).toBe('');
      expect(state.hasSearchResults).toBe(false);
    });

    it('should handle search with no results', () => {
      service.updateSearchText('nonexistent');
      service.performSearch(mockPdfComponent, 'nonexistent');
      jasmine.clock().tick(100);

      const state = service.updateSearchResults({ total: 0, current: 0 });
      expect(state.hasSearchResults).toBe(false);
      expect(state.searchResultsInfo).toBe('No matches found');

      // Should not be able to navigate
      service.findNext(mockPdfComponent);
      service.findPrevious(mockPdfComponent);

      // Only the initial search calls should have been made
      expect(mockEventBus.dispatch).toHaveBeenCalledTimes(2); // clear + search
    });

    it('should maintain state consistency across operations', () => {
      // Test multiple searches
      service.updateSearchText('first');
      service.updateSearchResults({ total: 2, current: 1 });
      expect(service.getSearchState().hasSearchResults).toBe(true);

      service.updateSearchText('second');
      service.updateSearchResults({ total: 0, current: 0 });
      expect(service.getSearchState().hasSearchResults).toBe(false);

      service.clearSearch();
      expect(service.getSearchState().searchText).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long search text', () => {
      const longText = 'a'.repeat(1000);
      service.updateSearchText(longText);
      
      const state = service.getSearchState();
      expect(state.searchText).toBe(longText);
    });

    it('should handle search text with newlines', () => {
      const textWithNewlines = 'line1\nline2\rline3\r\nline4';
      service.updateSearchText(textWithNewlines);
      
      const state = service.getSearchState();
      expect(state.searchText).toBe(textWithNewlines);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '测试文本 🔍 ñáéíóú';
      service.updateSearchText(unicodeText);
      
      const state = service.getSearchState();
      expect(state.searchText).toBe(unicodeText);
    });

    it('should handle negative match counts gracefully', () => {
      const state = service.updateSearchResults({ total: -1, current: -1 });
      
      expect(state.totalSearchMatches).toBe(-1);
      expect(state.currentSearchMatchIndex).toBe(-1);
      expect(state.hasSearchResults).toBe(false);
    });

    it('should handle extremely large match counts', () => {
      const largeCount = 999999;
      const state = service.updateSearchResults({ total: largeCount, current: 500000 });
      
      expect(state.totalSearchMatches).toBe(largeCount);
      expect(state.currentSearchMatchIndex).toBe(500000);
      expect(state.hasSearchResults).toBe(true);
      expect(state.searchResultsInfo).toBe(`${largeCount} matches found`);
    });
  });
});
