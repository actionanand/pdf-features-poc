# Console Manager Quick Reference

## 🚀 Quick Actions

### Enable Console Logs

**Method 1: UI Button (Easiest)**
1. Look for purple floating button (bottom-right)
2. Click to open panel
3. Click "Enable Console Logs"

**Method 2: Browser Console**
```javascript
localStorage.setItem('enableLog', 'ON');
location.reload();
```

**Method 3: Programmatic**
```typescript
this.consoleManagerService.enableConsole();
```

### Disable Console Logs

**Method 1: UI Button**
1. Click floating button
2. Click "Disable Console Logs"

**Method 2: Browser Console**
```javascript
localStorage.removeItem('enableLog');
location.reload();
```

**Method 3: Programmatic**
```typescript
this.consoleManagerService.disableConsole();
```

### Check Current State

**Browser Console:**
```javascript
localStorage.getItem('enableLog'); // Returns 'ON' if enabled, null if disabled
```

**In Code:**
```typescript
const enabled = this.consoleManagerService.isConsoleEnabled();
console.log('Console is:', enabled ? 'ON' : 'OFF');
```

## 🔧 Common Use Cases

### Toggle Console in Component

```typescript
import { ConsoleManagerService } from './console-manager/services/console-manager.service';

export class MyComponent {
  constructor(private consoleManager: ConsoleManagerService) {}

  toggleDebug() {
    this.consoleManager.toggleConsole();
  }
}
```

### Listen to State Changes

```typescript
ngOnInit() {
  this.consoleManager.getConsoleState().subscribe(isEnabled => {
    console.log('Console state:', isEnabled);
  });
}
```

### Conditional Logging

```typescript
if (this.consoleManager.isConsoleEnabled()) {
  const heavyDebugData = this.generateDebugInfo();
  console.log('Debug:', heavyDebugData);
}
```

## ⚙️ Configuration

**File:** `src/app/console-manager/config/console-manager.config.ts`

```typescript
export const CONSOLE_MANAGER_CONFIG = {
  storageKey: 'enableLog',        // Change localStorage key
  enableValue: 'ON',               // Change enable value
  defaultEnabled: false,           // true = enabled by default
  interceptMethods: [...],         // Console methods to control
  showDisabledWarning: true,      // Show warning when disabled
};
```

## 🐛 Debugging

### Force Restore Console (Emergency)

```typescript
// Use only for debugging the console manager itself
this.consoleManagerService.forceRestoreConsole();
```

**Browser Console:**
```javascript
// Directly restore console
console = window.console.__proto__;
```

### Check Service Status

```typescript
const initialized = this.consoleManagerService.isServiceInitialized();
const config = this.consoleManagerService.getConfig();
```

## 📱 UI Customization

### Hide UI Component

Remove from `app.component.html`:
```html
<!-- Remove this line -->
<app-console-manager></app-console-manager>
```

### Change Button Position

Edit `console-manager.component.scss`:
```scss
.console-toggle-fab {
  bottom: 24px;
  right: 24px;   // Change to left: 24px for left side
}
```

### Change Colors

```scss
.console-toggle-fab {
  // Disabled state
  background: linear-gradient(135deg, #your-color 0%, #your-color 100%);
  
  &.active {
    // Enabled state
    background: linear-gradient(135deg, #your-color 0%, #your-color 100%);
  }
}
```

## 🧪 Testing

### Test with Console Disabled

```typescript
beforeEach(() => {
  const service = TestBed.inject(ConsoleManagerService);
  service.disableConsole();
});
```

### Test with Console Enabled

```typescript
beforeEach(() => {
  const service = TestBed.inject(ConsoleManagerService);
  service.enableConsole();
});
```

## 📊 Controlled Console Methods

By default, these methods are controlled:
- `console.log()`
- `console.debug()`
- `console.info()`
- `console.warn()`
- `console.error()`
- `console.trace()`
- `console.table()`
- `console.group()`
- `console.groupEnd()`
- `console.groupCollapsed()`

## ⚡ Performance Tips

1. **Disable in production:**
   ```typescript
   defaultEnabled: !environment.production
   ```

2. **Guard expensive operations:**
   ```typescript
   if (this.consoleManager.isConsoleEnabled()) {
     console.log(expensiveCalculation());
   }
   ```

3. **Use appropriate log levels:**
   ```typescript
   console.error('Critical errors only');
   console.log('Debug information');
   ```

## 🔐 Security

**⚠️ Important:**
- Never log passwords, tokens, or sensitive data
- Users can re-enable console logs
- This is NOT a security feature
- Remove sensitive data before logging

```typescript
// ❌ Bad
console.log('User:', { password, token });

// ✅ Good
console.log('User:', { id, email });
```

## 📂 File Locations

- **Config:** `src/app/console-manager/config/console-manager.config.ts`
- **Service:** `src/app/console-manager/services/console-manager.service.ts`
- **Component:** `src/app/console-manager/components/console-manager.component.ts`
- **Styles:** `src/app/console-manager/components/console-manager.component.scss`
- **Integration:** `src/app/app.component.ts` (constructor)
- **UI:** `src/app/app.component.html` (console-manager component)

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Logs not appearing | Check `localStorage.getItem('enableLog')` === 'ON' |
| Button not visible | Verify `<app-console-manager>` in app.component.html |
| Console always on | Check `defaultEnabled` in config |
| State not persisting | Clear browser cache and localStorage |
| Cross-tab sync not working | Refresh all tabs after changing state |

## 📚 Full Documentation

See `CONSOLE_MANAGER_README.md` for complete documentation.

---

**Default State:** Console logs are **DISABLED** by default.

**Enable:** `localStorage.setItem('enableLog', 'ON')` + refresh

**Disable:** `localStorage.removeItem('enableLog')` + refresh
