import { Component } from '@angular/core';

export interface ViewerCard {
  title: string;
  description: string;
  features: string[];
  routeLink: string;
  buttonText: string;
  cssClass: string;
  buttonClass: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  
  viewerCards: ViewerCard[] = [
    {
      title: 'NG2 PDF Viewer',
      description: 'Enhanced PDF viewer with comprehensive features and attachments support',
      features: [
        'Enhanced toolbar with complete controls',
        'Thumbnail sidebar with page previews',
        'Interactive index/outline navigation',
        'Attachment detection & download (100+ file types)',
        'Advanced search with match highlighting',
        'Single page vs continuous scroll modes',
        'Page synchronization & navigation',
        'Download & print functionality',
        'Zoom controls & fit-to-page',
        'Mutually exclusive sidebar views',
        'File type detection by binary signatures',
        'Proper MIME type handling for downloads'
      ],
      routeLink: '/pdf-viewer',
      buttonText: 'Try NG2 PDF Viewer',
      cssClass: '',
      buttonClass: 'btn-primary'
    },
    {
      title: 'Dual PDF Viewer',
      description: 'Side-by-side PDF viewer with synchronized scrolling',
      features: [
        'Two-column PDF comparison',
        'File upload for both sides',
        'URL loading support',
        'Link/unlink scrolling',
        'Synchronized page navigation',
        'Individual zoom controls',
        'Independent loading states',
        'Responsive design',
        'Clear and reset functions'
      ],
      routeLink: '/dual-pdf-viewer',
      buttonText: 'Try Dual PDF Viewer',
      cssClass: 'dual-viewer',
      buttonClass: 'btn-primary dual-btn'
    },
    {
      title: 'NGX Extended PDF Viewer',
      description: 'Full-featured PDF viewer with advanced capabilities',
      features: [
        'Complete PDF.js integration',
        'Advanced search functionality',
        'Annotations support',
        'Print & download options',
        'Customizable toolbar',
        'Blob loading support'
      ],
      routeLink: '/extended-pdf-viewer',
      buttonText: 'Try NGX Extended PDF Viewer',
      cssClass: 'featured',
      buttonClass: 'btn-primary featured-btn'
    },
    {
      title: 'Vanilla PDF.js',
      description: 'Pure PDF.js implementation without third-party wrappers',
      features: [
        'Direct PDF.js API usage',
        'Custom canvas rendering',
        'Text layer for search',
        'Thumbnail generation',
        'Rotation & zoom controls',
        'Full-text search',
        'No external dependencies'
      ],
      routeLink: '/vanilla-pdfjs',
      buttonText: 'Try Vanilla PDF.js',
      cssClass: 'vanilla',
      buttonClass: 'btn-primary vanilla-btn'
    }
  ];
}
