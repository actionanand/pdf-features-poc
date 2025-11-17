import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LockGuard } from './lock.guard';
import { LockScreenService } from '../services/lock-screen.service';

describe('LockGuard', () => {
  let guard: LockGuard;
  let lockScreenService: jasmine.SpyObj<LockScreenService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const lockScreenServiceSpy = jasmine.createSpyObj('LockScreenService', ['isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        LockGuard,
        { provide: LockScreenService, useValue: lockScreenServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(LockGuard);
    lockScreenService = TestBed.inject(LockScreenService) as jasmine.SpyObj<LockScreenService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation when authenticated', () => {
    lockScreenService.isAuthenticated.and.returnValue(true);

    const result = guard.canActivate(
      {} as any,
      {} as any
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to lock screen when not authenticated', () => {
    lockScreenService.isAuthenticated.and.returnValue(false);

    const result = guard.canActivate(
      {} as any,
      {} as any
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/lock']);
  });
});
