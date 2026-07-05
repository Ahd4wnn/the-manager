# The Manager — Android app

Native Kotlin + Jetpack Compose, staff-facing. Talks to the FastAPI backend.

## Requirements (already present on the dev machine)
- Android Studio (bundled JDK 21) + Android SDK (platform 35, platform-tools)
- A physical device with **USB debugging** enabled, or an emulator

## Run on a USB phone
1. On the phone: enable **Developer options → USB debugging**, connect via USB,
   and tap **Allow** on the "Allow USB debugging?" prompt.
2. Make sure the backend is running on the dev machine (`http://localhost:8000`).
3. From `android/`:
   ```powershell
   powershell -File run-on-device.ps1
   ```
   This builds the APK, runs `adb reverse tcp:8000 tcp:8000` (so the phone's
   `localhost:8000` reaches the dev machine), installs and launches the app.

> The app talks to `http://localhost:8000/api/v1/` (see `API_BASE` in
> `app/build.gradle.kts`). `adb reverse` is what makes that reachable over USB.
> Cleartext HTTP is permitted only for localhost (see `network_security_config.xml`).

## Emulator
On the Android emulator, the host is `10.0.2.2`. Either run the same
`adb reverse` command, or change `API_BASE` to `http://10.0.2.2:8000/api/v1/`.

## Sign in
Use a clinic account (owner/manager/staff). Platform-admin accounts should use
the web console instead.

## Build only
```powershell
./gradlew.bat :app:assembleDebug
```
