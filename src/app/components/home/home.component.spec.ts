import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';

import { HomeComponent, ViewerCard } from './home.component';

// Mock component for routing tests
@Component({
  template: '<div>Mock Component</div>'
})
class MockComponent { }

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        HomeComponent,
        MockComponent
      ],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'pdf-viewer', component: MockComponent },
          { path: 'dual-pdf-viewer', component: MockComponent },
          { path: 'extended-pdf-viewer', component: MockComponent },
          { path: 'vanilla-pdfjs', component: MockComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with viewer cards', () => {
      expect(component.viewerCards).toBeDefined();
      expect(component.viewerCards.length).toBe(4);
    });

    it('should have ViewerCard interface properties', () => {
      const firstCard = component.viewerCards[0];
      expect(firstCard).toEqual(jasmine.objectContaining({
        title: jasmine.any(String),
        description: jasmine.any(String),
        features: jasmine.any(Array),
        routeLink: jasmine.any(String),
        buttonText: jasmine.any(String),
        cssClass: jasmine.any(String),
        buttonClass: jasmine.any(String)
      }));
    });
  });

  describe('Viewer Cards Data', () => {
    it('should have NG2 PDF Viewer card with correct properties', () => {
      const ng2Card = component.viewerCards[0];
      expect(ng2Card.title).toBe('NG2 PDF Viewer');
      expect(ng2Card.description).toBe('Enhanced PDF viewer with comprehensive features and attachments support');
      expect(ng2Card.routeLink).toBe('/pdf-viewer');
      expect(ng2Card.buttonText).toBe('Try NG2 PDF Viewer');
      expect(ng2Card.cssClass).toBe('');
      expect(ng2Card.buttonClass).toBe('btn-primary');
      expect(ng2Card.features.length).toBeGreaterThan(0);
      expect(ng2Card.features).toContain('Enhanced toolbar with complete controls');
    });

    it('should have Dual PDF Viewer card with correct properties', () => {
      const dualCard = component.viewerCards[1];
      expect(dualCard.title).toBe('Dual PDF Viewer');
      expect(dualCard.description).toBe('Side-by-side PDF viewer with synchronized scrolling');
      expect(dualCard.routeLink).toBe('/dual-pdf-viewer');
      expect(dualCard.buttonText).toBe('Try Dual PDF Viewer');
      expect(dualCard.cssClass).toBe('dual-viewer');
      expect(dualCard.buttonClass).toBe('btn-primary dual-btn');
      expect(dualCard.features).toContain('Two-column PDF comparison');
      expect(dualCard.features).toContain('Link/unlink scrolling');
    });

    it('should have NGX Extended PDF Viewer card with correct properties', () => {
      const extendedCard = component.viewerCards[2];
      expect(extendedCard.title).toBe('NGX Extended PDF Viewer');
      expect(extendedCard.description).toBe('Full-featured PDF viewer with advanced capabilities');
      expect(extendedCard.routeLink).toBe('/extended-pdf-viewer');
      expect(extendedCard.buttonText).toBe('Try NGX Extended PDF Viewer');
      expect(extendedCard.cssClass).toBe('featured');
      expect(extendedCard.buttonClass).toBe('btn-primary featured-btn');
      expect(extendedCard.features).toContain('Complete PDF.js integration');
    });

    it('should have Vanilla PDF.js card with correct properties', () => {
      const vanillaCard = component.viewerCards[3];
      expect(vanillaCard.title).toBe('Vanilla PDF.js');
      expect(vanillaCard.description).toBe('Pure PDF.js implementation without third-party wrappers');
      expect(vanillaCard.routeLink).toBe('/vanilla-pdfjs');
      expect(vanillaCard.buttonText).toBe('Try Vanilla PDF.js');
      expect(vanillaCard.cssClass).toBe('vanilla');
      expect(vanillaCard.buttonClass).toBe('btn-primary vanilla-btn');
      expect(vanillaCard.features).toContain('Direct PDF.js API usage');
      expect(vanillaCard.features).toContain('No external dependencies');
    });

    it('should have all cards with non-empty features arrays', () => {
      component.viewerCards.forEach((card, index) => {
        expect(card.features.length).toBeGreaterThan(0);
        expect(card.features.every(feature => feature.length > 0)).toBe(true);
      });
    });

    it('should have unique route links for all cards', () => {
      const routeLinks = component.viewerCards.map(card => card.routeLink);
      const uniqueRoutes = new Set(routeLinks);
      expect(uniqueRoutes.size).toBe(routeLinks.length);
    });
  });

  describe('Template Rendering', () => {
    it('should render the main heading', () => {
      const headingElement = fixture.debugElement.query(By.css('h1'));
      expect(headingElement.nativeElement.textContent).toBe('PDF Viewer Demo');
    });

    it('should render the welcome paragraph', () => {
      const paragraphElement = fixture.debugElement.query(By.css('p'));
      expect(paragraphElement.nativeElement.textContent).toBe('Welcome to the PDF Viewer application featuring multiple PDF libraries');
    });

    it('should render all viewer cards', () => {
      const cardElements = fixture.debugElement.queryAll(By.css('.viewer-card'));
      expect(cardElements.length).toBe(4);
    });

    it('should render card titles correctly', () => {
      const titleElements = fixture.debugElement.queryAll(By.css('.viewer-card h3'));
      const expectedTitles = [
        'NG2 PDF Viewer',
        'Dual PDF Viewer',
        'NGX Extended PDF Viewer',
        'Vanilla PDF.js'
      ];

      titleElements.forEach((titleElement, index) => {
        expect(titleElement.nativeElement.textContent).toBe(expectedTitles[index]);
      });
    });

    it('should render card descriptions correctly', () => {
      const descriptionElements = fixture.debugElement.queryAll(By.css('.viewer-card p'));
      const expectedDescriptions = [
        'Enhanced PDF viewer with comprehensive features and attachments support',
        'Side-by-side PDF viewer with synchronized scrolling',
        'Full-featured PDF viewer with advanced capabilities',
        'Pure PDF.js implementation without third-party wrappers'
      ];

      descriptionElements.forEach((descElement, index) => {
        expect(descElement.nativeElement.textContent).toBe(expectedDescriptions[index]);
      });
    });

    it('should render features lists for each card', () => {
      const featureListElements = fixture.debugElement.queryAll(By.css('.features ul'));
      expect(featureListElements.length).toBe(4);

      featureListElements.forEach((listElement, cardIndex) => {
        const featureItems = listElement.queryAll(By.css('li'));
        expect(featureItems.length).toBe(component.viewerCards[cardIndex].features.length);
        
        featureItems.forEach((item, featureIndex) => {
          expect(item.nativeElement.textContent).toBe(component.viewerCards[cardIndex].features[featureIndex]);
        });
      });
    });

    it('should render buttons with correct text and router links', () => {
      const buttonElements = fixture.debugElement.queryAll(By.css('button[routerLink]'));
      expect(buttonElements.length).toBe(4);

      buttonElements.forEach((buttonElement, index) => {
        const button = buttonElement.nativeElement;
        expect(button.textContent.trim()).toBe(component.viewerCards[index].buttonText);
        expect(buttonElement.attributes['ng-reflect-router-link']).toBe(component.viewerCards[index].routeLink);
      });
    });

    it('should apply correct CSS classes to cards', () => {
      const cardElements = fixture.debugElement.queryAll(By.css('.viewer-card'));
      
      // Check dual-viewer card
      const dualCard = cardElements[1];
      expect(dualCard.nativeElement.classList.contains('dual-viewer')).toBe(true);
      
      // Check featured card
      const featuredCard = cardElements[2];
      expect(featuredCard.nativeElement.classList.contains('featured')).toBe(true);
      
      // Check vanilla card
      const vanillaCard = cardElements[3];
      expect(vanillaCard.nativeElement.classList.contains('vanilla')).toBe(true);
    });

    it('should apply correct CSS classes to buttons', () => {
      const buttonElements = fixture.debugElement.queryAll(By.css('button[routerLink]'));
      
      buttonElements.forEach((buttonElement, index) => {
        const expectedClasses = component.viewerCards[index].buttonClass.split(' ');
        expectedClasses.forEach(cssClass => {
          expect(buttonElement.nativeElement.classList.contains(cssClass)).toBe(true);
        });
      });
    });
  });

  describe('Component Structure', () => {
    it('should have proper container structure', () => {
      const containerElement = fixture.debugElement.query(By.css('.home-container'));
      expect(containerElement).toBeTruthy();
      
      const cardsContainerElement = fixture.debugElement.query(By.css('.viewer-cards'));
      expect(cardsContainerElement).toBeTruthy();
    });

    it('should have features section in each card', () => {
      const featuresSections = fixture.debugElement.queryAll(By.css('.features'));
      expect(featuresSections.length).toBe(4);
    });
  });

  describe('Data Integrity', () => {
    it('should not have empty or undefined values in card data', () => {
      component.viewerCards.forEach((card, index) => {
        expect(card.title).toBeTruthy();
        expect(card.description).toBeTruthy();
        expect(card.routeLink).toBeTruthy();
        expect(card.buttonText).toBeTruthy();
        expect(card.buttonClass).toBeTruthy();
        expect(card.features).toBeTruthy();
        expect(Array.isArray(card.features)).toBe(true);
        
        // CSS class can be empty string, so just check it's defined
        expect(card.cssClass).toBeDefined();
      });
    });

    it('should have consistent route link format', () => {
      component.viewerCards.forEach(card => {
        expect(card.routeLink).toMatch(/^\/[a-z-]+$/);
      });
    });

    it('should have consistent button class format', () => {
      component.viewerCards.forEach(card => {
        expect(card.buttonClass).toContain('btn-primary');
      });
    });
  });

  describe('ViewerCard Interface', () => {
    it('should match ViewerCard interface structure', () => {
      const testCard: ViewerCard = {
        title: 'Test Title',
        description: 'Test Description',
        features: ['Feature 1', 'Feature 2'],
        routeLink: '/test-route',
        buttonText: 'Test Button',
        cssClass: 'test-class',
        buttonClass: 'btn-test'
      };

      // This test ensures the interface is properly exported and usable
      expect(testCard).toBeDefined();
      expect(typeof testCard.title).toBe('string');
      expect(Array.isArray(testCard.features)).toBe(true);
    });
  });
});
