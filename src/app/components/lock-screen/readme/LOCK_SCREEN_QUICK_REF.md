# Lock Screen Quick Reference

## 🔐 Default Credentials
**Password:** `admin123`

## 🔧 Quick Actions

### Change Password
1. Generate SHA1 hash: https://emn178.github.io/online-tools/sha1.html
2. Update `passwordHash` in `src/app/config/lock-screen.config.ts`
3. Clear local storage: `localStorage.clear()`

### Set Expiry Time
Edit `src/app/config/lock-screen.config.ts`:
```typescript
expiryTime: 3600000,    // 1 hour
expiryTime: 86400000,   // 24 hours
expiryTime: 604800000,  // 7 days
expiryTime: 0,          // No expiry (default)
```

### Force Re-authentication
```javascript
localStorage.removeItem('pdf_viewer_auth_token');
```

### Add Logout Button
```typescript
// In component
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
<!-- In template -->
<button (click)="logout()">Logout</button>
```

## 📁 Key Files
- **Config:** `src/app/config/lock-screen.config.ts`
- **Service:** `src/app/services/lock-screen.service.ts`
- **Guard:** `src/app/guards/lock.guard.ts`
- **Component:** `src/app/components/lock-screen/`

## 🧪 Testing Commands

```javascript
// In browser console

// Clear authentication
localStorage.clear();

// Check current auth state
localStorage.getItem('pdf_viewer_auth_token');

// Generate SHA1 hash
async function sha1(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
sha1('your-password').then(console.log);
```

## 📚 Full Documentation
See `LOCK_SCREEN_README.md` for complete documentation.
