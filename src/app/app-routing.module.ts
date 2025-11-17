import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { Ng2PdfViewerComponent } from './components/ng2-pdf-viewer/ng2-pdf-viewer.component';
import { NgxExtendedPdfViewerComponent } from './components/ngx-extended-pdf-viewer/ngx-extended-pdf-viewer.component';
import { VanillaPdfjsComponent } from './components/vanilla-pdfjs/vanilla-pdfjs.component';
import { DualPdfViewerComponent } from './components/dual-pdf-viewer/dual-pdf-viewer.component';
import { LockScreenComponent } from './components/lock-screen/lock-screen.component';
import { LockGuard } from './components/lock-screen/guards/lock.guard';

const routes: Routes = [
  { path: 'lock', component: LockScreenComponent },
  { path: '', component: HomeComponent, canActivate: [LockGuard] },
  { path: 'pdf-viewer', component: Ng2PdfViewerComponent, canActivate: [LockGuard] },
  { path: 'dual-pdf-viewer', component: DualPdfViewerComponent, canActivate: [LockGuard] },
  { path: 'extended-pdf-viewer', component: NgxExtendedPdfViewerComponent, canActivate: [LockGuard] },
  { path: 'vanilla-pdfjs', component: VanillaPdfjsComponent, canActivate: [LockGuard] },
  { path: '**', redirectTo: 'lock' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
