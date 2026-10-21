# Elvie (Android)

React Native (Expo) port of `elvie-ios/Elvie`. Same `/v1` API calls, Google ID token → Supabase session, and dark card-stack shell.

The computer surface follows the **gowtham** backend sandbox model:

- `/v1/computer/status` is per-user when `SANDBOX_MODE=per_user` (detail: `No active user sandbox`).
- Takeover is screenshot + `/v1/computer/action` (per-user VNC is not published).
- `/v1/computer/session` is used only in legacy shared-box mode.

Package id: `com.anassyed.elvie`. Public homelab URLs and the Supabase **anon** key match iOS (`AppConfig.ts`).

## One-time setup

1. Android Studio with SDK + platform-tools (`adb`).
2. Node 20+.
3. A Google Cloud **Android** OAuth client for `com.anassyed.elvie` with this debug SHA-1 (print yours if you use another keystore):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

The app still uses the existing **web** client id to obtain an ID token for Supabase (`signInWithIdToken`), same as iOS.

```bash
cd elvie-android
npm install
```

## Build on a phone over USB

Enable Developer options → USB debugging, plug in the phone, authorize the RSA prompt.

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
adb devices   # your device must show as "device"

cd /Users/user25/gowtham/Personal_Projects/elvie/elvie-android
npx expo run:android --device
```

That generates `android/`, compiles a debug APK with the Google Sign-In native module, installs it, and starts Metro.

Later sessions (native project already generated):

```bash
adb devices
npx expo start --dev-client
# then open the Elvie app on the phone, or:
npx expo run:android --device
```

Release-style local install without Metro (after a successful `expo run:android`):

```bash
cd android
./gradlew installDebug
```

## Scripts

- `npm start` — Metro (`expo start`)
- `npx expo run:android --device` — compile + USB install
- `npx tsc --noEmit` — typecheck
