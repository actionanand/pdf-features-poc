# Lock Screen Security Reminder

## ⚠️ IMPORTANT SECURITY NOTICE

### Config File Security

The lock screen configuration file contains sensitive information:
- Password hash (SHA1)
- Storage keys
- Configuration settings

**Location:** `src/app/config/lock-screen.config.ts`

## 🔐 Production Best Practices

### 1. Environment-Specific Configs

For production deployments, consider:

```typescript
// src/app/config/lock-screen.config.prod.ts
export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: process.env['LOCK_PASSWORD_HASH'] || 'default-hash',
  // ... other settings
};
```

### 2. Environment Variables

Use environment variables for sensitive data:

```typescript
// angular.json or environment.ts
export const environment = {
  production: true,
  lockPasswordHash: 'your-production-hash'
};

// lock-screen.config.ts
import { environment } from '../environments/environment';

export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: environment.lockPasswordHash,
  // ...
};
```

### 3. Git Ignore

Add sensitive config files to `.gitignore`:

```gitignore
# Lock screen configs with real passwords
src/app/config/lock-screen.config.prod.ts
src/app/config/lock-screen.config.*.ts
!src/app/config/lock-screen.config.ts

# Environment files with secrets
.env
.env.local
.env.*.local
```

### 4. Template Config

Keep a template config in git:

```typescript
// lock-screen.config.template.ts
export const LOCK_SCREEN_CONFIG: LockScreenConfig = {
  passwordHash: 'REPLACE_WITH_YOUR_SHA1_HASH',
  expiryTime: 0,
  storageKey: 'pdf_viewer_auth_token',
  // ...
};
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Change the default password (`admin123`)
- [ ] Generate new SHA1 hash for production password
- [ ] Use environment variables for sensitive data
- [ ] Set appropriate expiry time for your use case
- [ ] Remove or comment out the hint text in the UI
- [ ] Update storage key to something unique
- [ ] Test authentication flow thoroughly
- [ ] Enable HTTPS if hosting publicly
- [ ] Consider server-side authentication for sensitive apps
- [ ] Document the production password securely (password manager)
- [ ] Add `.gitignore` entries for production configs

## 📝 Current Setup (Development)

**Current config:** `src/app/config/lock-screen.config.ts`
- Password: `admin123` (default - **CHANGE FOR PRODUCTION**)
- SHA1: `d033e22ae348aeb5660fc2140aec35850c4da997`
- Expiry: None (0)
- Storage Key: `pdf_viewer_auth_token`

## 🔄 How to Update for Production

1. **Generate production password hash:**
   ```javascript
   // In browser console or Node.js
   async function sha1(text) {
     const buf = new TextEncoder().encode(text);
     const hash = await crypto.subtle.digest('SHA-1', buf);
     return Array.from(new Uint8Array(hash))
       .map(b => b.toString(16).padStart(2, '0'))
       .join('');
   }
   sha1('your-production-password').then(console.log);
   ```

2. **Update config file:**
   - Open `src/app/config/lock-screen.config.ts`
   - Replace `passwordHash` with your new hash
   - Set appropriate `expiryTime`
   - Update UI messages (remove hint if needed)

3. **Secure the password:**
   - Store production password in a password manager
   - Share securely with authorized team members only
   - Never commit production passwords to git

## 🔒 Password Management

### Recommended Approach

1. **Development:** Use default `admin123` (already configured)
2. **Staging:** Use environment-specific password
3. **Production:** Use strong password via environment variables

### Strong Password Guidelines

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not a dictionary word
- Unique to this application
- Changed periodically (if using expiry)

## 📞 Support

For questions about:
- **Security:** Review `LOCK_SCREEN_README.md` security section
- **Configuration:** See `LOCK_SCREEN_README.md` configuration guide
- **Quick tasks:** Check `LOCK_SCREEN_QUICK_REF.md`

---

**Remember:** This is a client-side authentication system. For production applications with sensitive data, implement server-side authentication.
