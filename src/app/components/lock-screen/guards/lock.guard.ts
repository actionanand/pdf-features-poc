import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { LockScreenService } from '../services/lock-screen.service';

@Injectable({
  providedIn: 'root'
})
export class LockGuard implements CanActivate {

  constructor(
    private lockScreenService: LockScreenService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isAuthenticated = this.lockScreenService.isAuthenticated();

    if (!isAuthenticated) {
      // Redirect to lock screen
      this.router.navigate(['/lock']);
      return false;
    }

    return true;
  }
}
