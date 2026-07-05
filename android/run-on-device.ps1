# Build, install and launch the debug app on a USB-connected device.
# Usage:  powershell -File run-on-device.ps1
$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "1/4  Building debug APK..."
& "$PSScriptRoot\gradlew.bat" :app:assembleDebug --console=plain

Write-Host "2/4  Mapping device localhost:8000 -> dev machine (adb reverse)..."
& $adb reverse tcp:8000 tcp:8000

Write-Host "3/4  Installing..."
& $adb install -r "$PSScriptRoot\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "4/4  Launching..."
& $adb shell am start -n "com.bmw.manager/.MainActivity"
Write-Host "Done. Make sure the FastAPI backend is running on http://localhost:8000"
