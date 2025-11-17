import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LockScreenComponent } from './lock-screen.component';
import { LockScreenService } from './services/lock-screen.service';
import { LOCK_SCREEN_CONFIG } from './config/lock-screen.config';

describe('LockScreenComponent', () => {
  let component: LockScreenComponent;
  let fixture: ComponentFixture<LockScreenComponent>;
  let lockScreenService: jasmine.SpyObj<LockScreenService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const lockScreenServiceSpy = jasmine.createSpyObj('LockScreenService', [
      'isAuthenticated',
      'validatePassword',
      'storeAuthToken',
      'getConfig'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    lockScreenServiceSpy.getConfig.and.returnValue(LOCK_SCREEN_CONFIG);

    await TestBed.configureTestingModule({
      declarations: [ LockScreenComponent ],
      imports: [ FormsModule ],
      providers: [
        { provide: LockScreenService, useValue: lockScreenServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LockScreenComponent);
    component = fixture.componentInstance;
    lockScreenService = TestBed.inject(LockScreenService) as jasmine.SpyObj<LockScreenService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load configuration on init', () => {
    expect(component.config).toBeTruthy();
    expect(component.config).toEqual(LOCK_SCREEN_CONFIG);
  });

  it('should redirect if already authenticated on init', () => {
    lockScreenService.isAuthenticated.and.returnValue(true);
    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should not redirect if not authenticated on init', () => {
    lockScreenService.isAuthenticated.and.returnValue(false);
    router.navigate.calls.reset();
    component.ngOnInit();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('onSubmit', () => {
    it('should not submit if password is empty', async () => {
      component.password = '';
      await component.onSubmit();
      expect(lockScreenService.validatePassword).not.toHaveBeenCalled();
    });

    it('should show success and redirect on valid password', async () => {
      component.password = 'admin123';
      lockScreenService.validatePassword.and.returnValue(Promise.resolve(true));

      await component.onSubmit();

      expect(lockScreenService.validatePassword).toHaveBeenCalledWith('admin123');
      expect(lockScreenService.storeAuthToken).toHaveBeenCalledWith('admin123');
      expect(component.showSuccess).toBe(true);
      expect(component.showError).toBe(false);

      // Wait for redirect timeout
      await new Promise(resolve => setTimeout(resolve, 900));
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show error on invalid password', async () => {
      component.password = 'wrongpassword';
      lockScreenService.validatePassword.and.returnValue(Promise.resolve(false));

      await component.onSubmit();

      expect(lockScreenService.validatePassword).toHaveBeenCalledWith('wrongpassword');
      expect(lockScreenService.storeAuthToken).not.toHaveBeenCalled();
      expect(component.showError).toBe(true);
      expect(component.showSuccess).toBe(false);
      expect(component.password).toBe('');
    });

    it('should handle validation errors', async () => {
      component.password = 'test';
      lockScreenService.validatePassword.and.returnValue(Promise.reject('error'));

      await component.onSubmit();

      expect(component.showError).toBe(true);
      expect(component.showSuccess).toBe(false);
      expect(component.password).toBe('');
    });

    it('should set loading state during submission', async () => {
      component.password = 'admin123';
      lockScreenService.validatePassword.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const submitPromise = component.onSubmit();
      expect(component.isLoading).toBe(true);

      await submitPromise;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('onPasswordInput', () => {
    it('should clear error and success messages', () => {
      component.showError = true;
      component.showSuccess = true;

      component.onPasswordInput();

      expect(component.showError).toBe(false);
      expect(component.showSuccess).toBe(false);
    });
  });

  describe('togglePasswordVisibility', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);

      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);

      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });
});
