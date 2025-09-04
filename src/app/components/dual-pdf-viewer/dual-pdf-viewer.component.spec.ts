import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualPdfViewerComponent } from './dual-pdf-viewer.component';

describe('DualPdfViewerComponent', () => {
  let component: DualPdfViewerComponent;
  let fixture: ComponentFixture<DualPdfViewerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DualPdfViewerComponent]
    });
    fixture = TestBed.createComponent(DualPdfViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
