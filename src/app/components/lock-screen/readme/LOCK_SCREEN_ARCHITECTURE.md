# Lock Screen Architecture

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Angular Application                     │  │
│  │                                                             │  │
│  │  ┌──────────────┐                                          │  │
│  │  │   App Root   │                                          │  │
│  │  │  Component   │                                          │  │
│  │  └──────┬───────┘                                          │  │
│  │         │                                                   │  │
│  │         ▼                                                   │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Angular Router                          │  │  │
│  │  │                                                       │  │  │
│  │  │  Routes:                                             │  │  │
│  │  │  • /lock           → LockScreenComponent (public)   │  │  │
│  │  │  • /               → HomeComponent (protected)      │  │  │
│  │  │  • /pdf-viewer     → Ng2PdfViewer (protected)       │  │  │
│  │  │  • /dual-pdf-viewer → DualPdfViewer (protected)     │  │  │
│  │  │  • ...             → Other routes (protected)       │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │         │                                                   │  │
│  │         │                                                   │  │
│  │  ┌──────▼───────┐      ┌─────────────────────────────┐     │  │
│  │  │  LockGuard   │──────│  LockScreenService          │     │  │
│  │  │              │      │                             │     │  │
│  │  │ Checks auth  │      │  • validatePassword()       │     │  │
│  │  │ before route │      │  • isAuthenticated()        │     │  │
│  │  │ activation   │      │  • storeAuthToken()         │     │  │
│  │  └──────────────┘      │  • clearAuthToken()         │     │  │
│  │                        │  • getRemainingTime()       │     │  │
│  │                        └─────────┬───────────────────┘     │  │
│  │                                  │                         │  │
│  │                                  │ reads from              │  │
│  │                                  ▼                         │  │
│  │                        ┌─────────────────────────────┐     │  │
│  │                        │  lock-screen.config.ts      │     │  │
│  │                        │                             │     │  │
│  │                        │  • passwordHash (SHA1)      │     │  │
│  │                        │  • expiryTime               │     │  │
│  │                        │  • storageKey               │     │  │
│  │                        │  • UI messages              │     │  │
│  │                        └─────────────────────────────┘     │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │         LockScreenComponent                          │  │  │
│  │  │                                                       │  │  │
│  │  │  • Password input field                             │  │  │
│  │  │  • Visibility toggle                                │  │  │
│  │  │  • Submit button                                    │  │  │
│  │  │  • Error/success messages                           │  │  │
│  │  │  • Loading state                                    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      Local Storage                           │ │
│  │                                                              │ │
│  │  Key: 'pdf_viewer_auth_token'                              │ │
│  │  Value: {                                                   │ │
│  │    hash: 'd033e22ae348aeb5660fc2140aec35850c4da997',      │ │
│  │    timestamp: 1234567890                                   │ │
│  │  }                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Authentication Flow

```
START
  │
  ▼
┌─────────────────────┐
│ User visits any URL │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │  LockGuard   │
    │   checks     │
    │    auth      │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌────────┐  ┌─────────┐
│  YES   │  │   NO    │
└────┬───┘  └────┬────┘
     │           │
     │           ▼
     │      ┌────────────────┐
     │      │ Redirect to    │
     │      │ /lock route    │
     │      └────────┬───────┘
     │               │
     │               ▼
     │      ┌─────────────────┐
     │      │ LockScreen      │
     │      │ Component       │
     │      │ displays        │
     │      └────────┬────────┘
     │               │
     │               ▼
     │      ┌─────────────────┐
     │      │ User enters     │
     │      │ password        │
     │      └────────┬────────┘
     │               │
     │               ▼
     │      ┌─────────────────┐
     │      │ Hash password   │
     │      │ with SHA1       │
     │      └────────┬────────┘
     │               │
     │               ▼
     │      ┌─────────────────┐
     │      │ Compare with    │
     │      │ config hash     │
     │      └────────┬────────┘
     │               │
     │         ┌─────┴─────┐
     │         │           │
     │         ▼           ▼
     │    ┌────────┐  ┌─────────┐
     │    │  MATCH │  │NO MATCH │
     │    └────┬───┘  └────┬────┘
     │         │           │
     │         ▼           ▼
     │    ┌────────────┐  ┌──────────────┐
     │    │Store token │  │ Show error   │
     │    │in local    │  │ message      │
     │    │storage     │  │ Clear input  │
     │    └────┬───────┘  └──────────────┘
     │         │                 │
     │         ▼                 │
     │    ┌────────────┐         │
     │    │Show success│         │
     │    │message     │         │
     │    └────┬───────┘         │
     │         │                 │
     │         ▼                 │
     └────►┌────────────┐        │
           │ Allow      │        │
           │ access to  │        │
           │ route      │        │
           └────────────┘        │
                  │              │
                  ▼              │
           ┌─────────────┐       │
           │  Render     │       │
           │  protected  │       │
           │  component  │       │
           └─────────────┘       │
                                │
                                │
           ┌────────────────────┘
           │
           ▼
      ┌──────────┐
      │   RETRY  │
      └──────────┘
```

## 🔍 Password Validation Flow

```
┌──────────────────────┐
│ User enters password │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────┐
│ LockScreenService        │
│ validatePassword()       │
│                          │
│ 1. Encode to UTF-8       │
│ 2. Apply SHA1 hash       │
│ 3. Convert to hex string │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Compare hashes           │
│                          │
│ Input hash === Config    │
│ hash?                    │
└──────────┬───────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌────────┐  ┌─────────┐
│  TRUE  │  │  FALSE  │
└────┬───┘  └────┬────┘
     │           │
     ▼           ▼
┌──────────┐  ┌──────────────┐
│ Success  │  │ Show error   │
└──────────┘  └──────────────┘
```

## 📦 Component Dependencies

```
┌─────────────────────────────────────────────────┐
│            LockScreenComponent                  │
│                                                 │
│  Imports:                                       │
│  • FormsModule (ngModel)                       │
│  • CommonModule (*ngIf, *ngFor)                │
│                                                 │
│  Injects:                                       │
│  • LockScreenService                           │
│  • Router                                       │
│                                                 │
│  Uses:                                          │
│  • lock-screen.config.ts                       │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│            LockScreenService                    │
│                                                 │
│  Uses:                                          │
│  • Web Crypto API (crypto.subtle.digest)       │
│  • LocalStorage API                            │
│  • lock-screen.config.ts                       │
│                                                 │
│  Provides:                                      │
│  • Password validation                         │
│  • Token management                            │
│  • Expiry checking                             │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│                 LockGuard                       │
│                                                 │
│  Implements:                                    │
│  • CanActivate interface                       │
│                                                 │
│  Injects:                                       │
│  • LockScreenService                           │
│  • Router                                       │
│                                                 │
│  Purpose:                                       │
│  • Protect routes                              │
│  • Redirect if not authenticated               │
└─────────────────────────────────────────────────┘
```

## 🗂️ File Organization

```
src/app/
├── config/
│   └── lock-screen.config.ts          ← Configuration
│
├── services/
│   ├── lock-screen.service.ts         ← Business logic
│   └── lock-screen.service.spec.ts    ← Unit tests
│
├── guards/
│   ├── lock.guard.ts                  ← Route protection
│   └── lock.guard.spec.ts             ← Unit tests
│
├── components/
│   └── lock-screen/
│       ├── lock-screen.component.ts   ← Component logic
│       ├── lock-screen.component.html ← Template
│       ├── lock-screen.component.scss ← Styles
│       └── lock-screen.component.spec.ts ← Unit tests
│
├── app-routing.module.ts              ← Route definitions
└── app.module.ts                      ← Module registration
```

## 🔐 Data Flow

```
┌──────────────┐
│ User enters  │
│ password     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Component    │
│ captures     │
│ input        │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Service          │
│ validates        │
│ (SHA1 compare)   │
└──────┬───────────┘
       │
       ├───► Valid
       │       │
       │       ▼
       │  ┌─────────────────┐
       │  │ Store in        │
       │  │ LocalStorage    │
       │  │                 │
       │  │ {               │
       │  │   hash: '...'   │
       │  │   timestamp: X  │
       │  │ }               │
       │  └─────────────────┘
       │
       └───► Invalid
               │
               ▼
          ┌─────────────┐
          │ Show error  │
          └─────────────┘
```

## 🕐 Expiry Check Flow

```
┌──────────────────┐
│ User navigates   │
│ to protected     │
│ route            │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ LockGuard          │
│ canActivate()      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ LockScreenService  │
│ isAuthenticated()  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Read from          │
│ LocalStorage       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Parse stored data  │
│ { hash, timestamp }│
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Check hash matches │
│ current config     │
└────────┬───────────┘
         │
         ├───► Hash mismatch
         │       │
         │       ▼
         │  ┌──────────────┐
         │  │ Clear token  │
         │  │ Return false │
         │  └──────────────┘
         │
         └───► Hash matches
                 │
                 ▼
         ┌───────────────────┐
         │ expiryTime > 0?   │
         └───────┬───────────┘
                 │
          ┌──────┴──────┐
          │             │
          ▼             ▼
       ┌────┐       ┌─────┐
       │ NO │       │ YES │
       └──┬─┘       └──┬──┘
          │            │
          │            ▼
          │   ┌─────────────────┐
          │   │ Calculate       │
          │   │ elapsed time    │
          │   └────────┬────────┘
          │            │
          │            ▼
          │   ┌─────────────────┐
          │   │ elapsed >       │
          │   │ expiryTime?     │
          │   └────────┬────────┘
          │            │
          │      ┌─────┴─────┐
          │      │           │
          │      ▼           ▼
          │   ┌────┐      ┌─────┐
          │   │YES │      │ NO  │
          │   └──┬─┘      └──┬──┘
          │      │           │
          │      ▼           │
          │   ┌──────────┐   │
          │   │Clear token│  │
          │   │Return false│ │
          │   └──────────┘   │
          │                  │
          └──────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │Return true  │
              │Allow access │
              └─────────────┘
```

## 📊 State Management

```
┌─────────────────────────────────────────┐
│        Component State                  │
│                                         │
│  • password: string                     │
│  • showError: boolean                   │
│  • showSuccess: boolean                 │
│  • isLoading: boolean                   │
│  • showPassword: boolean                │
│  • config: LockScreenConfig             │
└─────────────────────────────────────────┘
           │
           │ stored in
           ▼
┌─────────────────────────────────────────┐
│        Browser Storage                  │
│                                         │
│  LocalStorage:                          │
│  • Key: 'pdf_viewer_auth_token'        │
│  • Value: JSON string                   │
│    {                                    │
│      hash: 'sha1-hash',                │
│      timestamp: number                  │
│    }                                    │
└─────────────────────────────────────────┘
```

This architecture provides a secure, maintainable, and testable lock screen system for your Angular PDF viewer application.
