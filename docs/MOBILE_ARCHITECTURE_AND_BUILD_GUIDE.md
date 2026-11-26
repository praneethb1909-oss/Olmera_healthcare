# Olmera Cross-Platform Mobile Architecture & Build Guide (Android & iOS)

## 1. Architecture Overview

Olmera (`com.olmera.app`) is a cross-platform healthcare application built with **React 18 + TypeScript + Vite** and wrapped natively for **Android** and **iOS** via **Capacitor 8**.

| Layer | Technology | Purpose |
|---|---|---|
| UI & Responsive Shell | React 18, Tailwind CSS, `brand/tokens.css` | Calm Deep Fern & Parchment design system, WCAG AA contrast, 44px+ touch targets |
| Native Runtime | Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`) | Native WebView bridge, hardware back button, safe-area insets |
| Platform Design | `src/hooks/usePlatformDesign.ts`, `MobileBottomNav.tsx` | Material Design 3 pill navigation on Android; translucent HIG tab bar & light haptics on iOS |
| Native Plugins | `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar` | Lifecycle, tactile feedback, keyboard resize, status bar theming |
| Security & E2EE | `src/services/security/e2eeService.ts` | Web Crypto API: ECDH P-256 key exchange, AES-256-GCM encryption, PBKDF2-SHA256 (100k iter), HIPAA Safe Harbor redaction |

---

## 2. Platform-Specific Design Guidelines

### Android (Material Design 3)
- **Navigation Bar**: Surface container with `rounded-full` active pill indicator (`bg-[var(--color-primary)]/12`), tonal elevation, and selection haptics.
- **Floating Action**: Rounded-2xl primary booking button for Patients.
- **Hardware Back Button**: Handled in `src/App.tsx` via `CapApp.addListener('backButton')` to return to the role home view before exiting.
- **Permissions (`android/app/src/main/AndroidManifest.xml`)**: `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`.

### iOS (Apple Human Interface Guidelines)
- **Tab Bar**: Translucent frosted-glass bar (`backdrop-blur-xl`), crisp hairline separator, safe-area bottom inset (`env(safe-area-inset-bottom)`), and `ImpactStyle.Light` / `selectionChanged` haptics.
- **Content Inset & Mode**: Configured in `capacitor.config.ts` (`contentInset: 'always'`, `preferredContentMode: 'mobile'`, `iosScheme: 'https'`).
- **Privacy Strings (`ios/App/App/Info.plist`)**: Declares `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`, and `ITSAppUsesNonExemptEncryption = false`.

---

## 3. End-to-End Encryption & HIPAA Compliance

- **Doctor–Patient Consultation Messaging (`src/components/Chat.tsx`)**: Messages are encrypted client-side with **AES-256-GCM** using `e2eeService` before being persisted to Firestore `messages.encrypted_envelope`.
- **ECDH P-256 Key Agreement**: `e2eeService.generateIdentityKeyPair()` and `deriveSharedSecretKey()` establish shared 256-bit AES-GCM keys without transmitting private keys.
- **Local Vault Encryption**: `encryptWithPassphrase()` uses **PBKDF2-SHA256** (100,000 iterations, 16-byte cryptographic random salt) + AES-256-GCM.
- **Telemetry Redaction**: `redactPhiForTelemetry()` strips 18 HIPAA Safe Harbor identifiers (`fullName`, `phone`, `email`, `dob`, `address`, `ssn`, etc.) prior to logging.

---

## 4. Production Build Instructions

### Prerequisites
- Node.js 20+
- **Android**: Android Studio + JDK 17 + Android SDK
- **iOS**: macOS + Xcode 15+ + CocoaPods / Swift Package Manager

### Build & Sync Web Assets
```bash
npm install
npm run typecheck
npm test
npm run mobile:sync
```

### Android Release Build (AAB / APK)
1. Configure a release keystore in `android/app/build.gradle` (note `minifyEnabled true` and `shrinkResources true` are enabled for `release`).
2. Run:
   ```bash
   npm run android:sync
   cd android
   ./gradlew bundleRelease   # Generates Play Store .aab
   ./gradlew assembleRelease # Generates signed .apk
   ```

### iOS Release Build (IPA)
1. Sync assets and open Xcode on macOS:
   ```bash
   npm run ios:sync
   npm run ios:open
   ```
2. In Xcode (`ios/App/App.xcworkspace` / `.xcodeproj`), select your Apple Developer Team, configure provisioning profiles for `com.olmera.app`, and run **Product → Archive** to export the App Store / TestFlight `.ipa`.
