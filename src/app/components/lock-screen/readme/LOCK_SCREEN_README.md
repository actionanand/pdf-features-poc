# Lock Screen Feature Documentation

## Overview

The lock screen feature provides password-based authentication for the Angular PDF viewer application. Users must enter a valid password before accessing any application routes. The authentication state is stored in local storage with optional expiration.

## Features

- ✅ Password-based authentication using SHA1 hashing
- ✅ Configurable expiry time (or no expiry)
- ✅ Local storage persistence
- ✅ Automatic password change detection
- ✅ Beautiful, responsive UI with animations
- ✅ Password visibility toggle
- ✅ Route protection via Angular guards
- ✅ Success/error message feedback

## File Structure

```
src/app/
├── config/
│   └── lock-screen.config.ts          # Configuration file
├── services/
│   └── lock-screen.service.ts         # Authentication service
├── guards/
│   └── lock.guard.ts                  # Route guard
└── components/
    └── lock-screen/
        ├── lock-screen.component.ts   # Component logic
        ├── lock-screen.component.html # Template
        └── lock-screen.component.scss # Styles
```

## Configuration

### Default Settings

The default configuration is in `src/app/config/lock-screen.config.ts`:

```typescript
export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: 'd033e22ae348aeb5660fc2140aec35850c4da997', // 'admin123'
  expiryTime: 0, // No expiry
  storageKey: 'pdf_viewer_auth_token',
  ui: {
    title: 'PDF Viewer - Authentication Required',
    message: 'Please enter the password to access the application',
    successMessage: 'Authentication successful! Redirecting...',
    errorMessage: 'Invalid password. Please try again.',
    unlockButtonText: 'Unlock',
    passwordPlaceholder: 'Enter password'
  }
};
```

### Default Password

**Password:** `admin123`  
**SHA1 Hash:** `d033e22ae348aeb5660fc2140aec35850c4da997`

## How to Change the Password

### Method 1: Using Online Tool

1. Visit https://emn178.github.io/online-tools/sha1.html
2. Enter your desired password
3. Copy the generated SHA1 hash
4. Update `passwordHash` in `lock-screen.config.ts`

### Method 2: Using Node.js

```javascript
const crypto = require('crypto');
const password = 'your-new-password';
const hash = crypto.createHash('sha1').update(password).digest('hex');
console.log(hash);
```

### Method 3: Using Browser Console

```javascript
async function generateSHA1(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

generateSHA1('your-new-password').then(console.log);
```

## Configuration Options

### Expiry Time

Set the `expiryTime` value in milliseconds:

```typescript
expiryTime: 0,           // No expiry (default)
expiryTime: 3600000,     // 1 hour
expiryTime: 86400000,    // 24 hours
expiryTime: 604800000,   // 7 days
```

### Storage Key

Change the local storage key if needed:

```typescript
storageKey: 'pdf_viewer_auth_token',  // Default
storageKey: 'my_custom_auth_key',     // Custom
```

### UI Customization

Customize all UI text elements:

```typescript
ui: {
  title: 'Your Custom Title',
  message: 'Your custom message',
  successMessage: 'Success!',
  errorMessage: 'Error!',
  unlockButtonText: 'Login',
  passwordPlaceholder: 'Password'
}
```

## How It Works

### 1. Authentication Flow

```
User visits app
    ↓
LockGuard checks authentication
    ↓
Not authenticated → Redirect to /lock
    ↓
User enters password
    ↓
Password validated (SHA1 hash comparison)
    ↓
Valid → Store token in localStorage → Redirect to home
    ↓
Invalid → Show error message
```

### 2. Password Change Detection

When the password hash in the config changes:
- The service compares the stored hash with the current config hash
- If they don't match, authentication fails
- User must re-enter the new password

### 3. Expiry Checking

If `expiryTime > 0`:
- The service stores a timestamp when the user authenticates
- On each route navigation, the guard checks if the elapsed time exceeds `expiryTime`
- If expired, the user must re-authenticate

## Service Methods

### LockScreenService

```typescript
// Validate password
await lockScreenService.validatePassword(password: string): Promise<boolean>

// Store authentication token
lockScreenService.storeAuthToken(password: string): void

// Check if authenticated
lockScreenService.isAuthenticated(): boolean

// Clear authentication
lockScreenService.clearAuthToken(): void

// Get configuration
lockScreenService.getConfig(): LockScreenConfig

// Get remaining time (if expiry is set)
lockScreenService.getRemainingTime(): number
```

## Protected Routes

All application routes are protected by the `LockGuard`:

```typescript
const routes: Routes = [
  { path: 'lock', component: LockScreenComponent },
  { path: '', component: HomeComponent, canActivate: [LockGuard] },
  { path: 'pdf-viewer', component: Ng2PdfViewerComponent, canActivate: [LockGuard] },
  // ... other protected routes
];
```

## Testing

### Test Authentication

1. Clear local storage: `localStorage.clear()`
2. Navigate to the app
3. You should see the lock screen
4. Enter password: `admin123`
5. You should be redirected to the home page

### Test Password Change

1. Authenticate with `admin123`
2. Change `passwordHash` in config to a different value
3. Refresh the page
4. You should see the lock screen again (old password won't work)

### Test Expiry

1. Set `expiryTime: 10000` (10 seconds)
2. Authenticate successfully
3. Wait 10+ seconds
4. Navigate to any route
5. You should be redirected to lock screen

## Security Considerations

### ⚠️ Important Notes

1. **Client-side only**: This is a client-side authentication mechanism suitable for:
   - Demo/POC applications
   - Internal tools with trusted users
   - Basic content protection

2. **Not for production**: For production applications with sensitive data:
   - Use server-side authentication
   - Implement JWT tokens
   - Use HTTPS
   - Add rate limiting
   - Consider OAuth/SSO

3. **SHA1 considerations**: 
   - SHA1 is used for simplicity and browser compatibility
   - For production, use bcrypt or Argon2 on the server-side
   - Never store plain text passwords

4. **Local storage**: 
   - Local storage can be accessed via browser console
   - Consider using session storage for stricter security
   - Add additional layers (e.g., device fingerprinting)

## Customization Examples

### Example 1: Short Session (1 hour)

```typescript
export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: 'your-sha1-hash',
  expiryTime: 3600000, // 1 hour
  storageKey: 'session_token',
  ui: {
    title: 'Session Expired',
    message: 'Please log in again',
    // ... other UI settings
  }
};
```

### Example 2: Multiple Environment Support

Create different configs for different environments:

```typescript
// config/lock-screen.config.dev.ts
export const LOCK_SCREEN_CONFIG = {
  passwordHash: 'd033e22ae348aeb5660fc2140aec35850c4da997', // dev
  expiryTime: 0,
  // ...
};

// config/lock-screen.config.prod.ts
export const LOCK_SCREEN_CONFIG = {
  passwordHash: 'production-hash',
  expiryTime: 3600000,
  // ...
};
```

### Example 3: Add Logout Button

Add to any component:

```typescript
import { LockScreenService } from './services/lock-screen.service';

constructor(
  private lockScreenService: LockScreenService,
  private router: Router
) {}

logout() {
  this.lockScreenService.clearAuthToken();
  this.router.navigate(['/lock']);
}
```

```html
<button (click)="logout()">Logout</button>
```

## Troubleshooting

### Issue: Lock screen not showing

**Solution**: Clear browser cache and local storage

```javascript
localStorage.clear();
location.reload();
```

### Issue: Password not working

**Solution**: Verify SHA1 hash is correct

```javascript
// In browser console
async function verifySHA1(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('SHA1:', hashHex);
}
verifySHA1('admin123');
```

### Issue: Authentication persists after password change

**Solution**: Clear local storage after changing the password hash in config

```javascript
localStorage.removeItem('pdf_viewer_auth_token');
```

## Future Enhancements

Possible improvements:
- [ ] Multi-user support with different passwords
- [ ] Remember me checkbox
- [ ] Password strength indicator
- [ ] Failed attempt tracking/lockout
- [ ] Two-factor authentication
- [ ] Biometric authentication
- [ ] Session management dashboard
- [ ] Audit logging

## License

This feature is part of the PDF Features POC project.
