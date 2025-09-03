import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { Ng2PdfViewerComponent } from './components/ng2-pdf-viewer/ng2-pdf-viewer.component';
import { NgxExtendedPdfViewerComponent } from './components/ngx-extended-pdf-viewer/ngx-extended-pdf-viewer.component';
import { VanillaPdfjsComponent } from './components/vanilla-pdfjs/vanilla-pdfjs.component';
import { DualPdfViewerComponent } from './components/dual-pdf-viewer/dual-pdf-viewer.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'pdf-viewer', component: Ng2PdfViewerComponent },
  { path: 'dual-pdf-viewer', component: DualPdfViewerComponent },
  { path: 'extended-pdf-viewer', component: NgxExtendedPdfViewerComponent },
  { path: 'vanilla-pdfjs', component: VanillaPdfjsComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
