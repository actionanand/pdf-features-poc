import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LockScreenService } from './services/lock-screen.service';
import { LockScreenConfig } from './config/lock-screen.config';

@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss']
})
export class LockScreenComponent implements OnInit {
  password: string = '';
  showError: boolean = false;
  showSuccess: boolean = false;
  isLoading: boolean = false;
  config: LockScreenConfig;
  showPassword: boolean = false;

  constructor(
    private lockScreenService: LockScreenService,
    private router: Router
  ) {
    this.config = this.lockScreenService.getConfig();
  }

  ngOnInit(): void {
    // If already authenticated, redirect to home
    if (this.lockScreenService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.password) {
      return;
    }

    this.isLoading = true;
    this.showError = false;
    this.showSuccess = false;

    try {
      const isValid = await this.lockScreenService.validatePassword(this.password);
      
      if (isValid) {
        this.lockScreenService.storeAuthToken(this.password);
        this.showSuccess = true;
        
        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 800);
      } else {
        this.showError = true;
        this.password = '';
      }
    } catch (error) {
      this.showError = true;
      this.password = '';
    } finally {
      this.isLoading = false;
    }
  }

  onPasswordInput(): void {
    this.showError = false;
    this.showSuccess = false;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
