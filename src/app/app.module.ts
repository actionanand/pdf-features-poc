import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { Ng2PdfViewerComponent } from './components/ng2-pdf-viewer/ng2-pdf-viewer.component';
import { NgxExtendedPdfViewerComponent } from './components/ngx-extended-pdf-viewer/ngx-extended-pdf-viewer.component';
import { VanillaPdfjsComponent } from './components/vanilla-pdfjs/vanilla-pdfjs.component';
import { DualPdfViewerComponent } from './components/dual-pdf-viewer/dual-pdf-viewer.component';
import { LockScreenComponent } from './components/lock-screen/lock-screen.component';
import { ConsoleManagerComponent } from './console-manager/components/console-manager.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    Ng2PdfViewerComponent,
    NgxExtendedPdfViewerComponent,
    VanillaPdfjsComponent,
    DualPdfViewerComponent,
    LockScreenComponent,
    ConsoleManagerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    PdfViewerModule,
    NgxExtendedPdfViewerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
