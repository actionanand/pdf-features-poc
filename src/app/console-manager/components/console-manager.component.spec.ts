import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsoleManagerComponent } from './console-manager.component';
import { ConsoleManagerService } from '../services/console-manager.service';
import { of, BehaviorSubject } from 'rxjs';

describe('ConsoleManagerComponent', () => {
  let component: ConsoleManagerComponent;
  let fixture: ComponentFixture<ConsoleManagerComponent>;
  let consoleManagerService: jasmine.SpyObj<ConsoleManagerService>;
  let consoleStateSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    consoleStateSubject = new BehaviorSubject<boolean>(false);
    
    const consoleManagerServiceSpy = jasmine.createSpyObj('ConsoleManagerService', [
      'isConsoleEnabled',
      'enableConsole',
      'disableConsole',
      'toggleConsole',
      'getConsoleState'
    ]);

    consoleManagerServiceSpy.getConsoleState.and.returnValue(consoleStateSubject.asObservable());
    consoleManagerServiceSpy.isConsoleEnabled.and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [ ConsoleManagerComponent ],
      providers: [
        { provide: ConsoleManagerService, useValue: consoleManagerServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsoleManagerComponent);
    component = fixture.componentInstance;
    consoleManagerService = TestBed.inject(ConsoleManagerService) as jasmine.SpyObj<ConsoleManagerService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with console disabled state', () => {
    expect(component.isConsoleEnabled).toBe(false);
  });

  it('should subscribe to console state changes on init', () => {
    expect(consoleManagerService.getConsoleState).toHaveBeenCalled();
  });

  it('should update state when console state changes', () => {
    consoleStateSubject.next(true);
    expect(component.isConsoleEnabled).toBe(true);

    consoleStateSubject.next(false);
    expect(component.isConsoleEnabled).toBe(false);
  });

  describe('toggleConsole', () => {
    it('should call service toggleConsole method', () => {
      consoleManagerService.toggleConsole.and.returnValue(true);
      component.toggleConsole();
      expect(consoleManagerService.toggleConsole).toHaveBeenCalled();
    });

    it('should update local state after toggle', () => {
      consoleManagerService.toggleConsole.and.returnValue(true);
      component.toggleConsole();
      expect(component.isConsoleEnabled).toBe(true);
    });
  });

  describe('toggleVisibility', () => {
    it('should toggle panel visibility', () => {
      expect(component.isVisible).toBe(false);
      component.toggleVisibility();
      expect(component.isVisible).toBe(true);
      component.toggleVisibility();
      expect(component.isVisible).toBe(false);
    });
  });

  describe('enableConsole', () => {
    it('should call service enableConsole method', () => {
      component.enableConsole();
      expect(consoleManagerService.enableConsole).toHaveBeenCalled();
    });
  });

  describe('disableConsole', () => {
    it('should call service disableConsole method', () => {
      component.disableConsole();
      expect(consoleManagerService.disableConsole).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('UI rendering', () => {
    it('should show disabled status by default', () => {
      const compiled = fixture.nativeElement;
      expect(component.isConsoleEnabled).toBe(false);
    });

    it('should update UI when console is enabled', () => {
      component.isConsoleEnabled = true;
      fixture.detectChanges();
      expect(component.isConsoleEnabled).toBe(true);
    });

    it('should show panel when visible is true', () => {
      component.isVisible = true;
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector('.console-manager-panel');
      expect(panel.classList.contains('visible')).toBe(true);
    });

    it('should hide panel when visible is false', () => {
      component.isVisible = false;
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector('.console-manager-panel');
      expect(panel.classList.contains('visible')).toBe(false);
    });
  });
});
