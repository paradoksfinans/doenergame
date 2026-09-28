#!/usr/bin/env bash
# Baut die Android-App. Wird von .github/workflows/android-apk.yml aufgerufen –
# Änderungen am Bauablauf passieren hier, damit die Workflow-Datei nicht mehr angefasst werden muss.
#   immer:            out/DoenerPalast-<version>-build<n>.apk   (Test-APK zum direkten Installieren)
#   mit Secrets:      out/DoenerPalast-<version>-build<n>.aab   (für den Play Store, mit Upload-Schlüssel signiert)
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci
npm run build
npx cap sync android

VER=$(node -p "require('./package.json').version")
N=${GITHUB_RUN_NUMBER:-1}
mkdir -p out

cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
chmod +x gradlew

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/upload.keystore"
  export ANDROID_KEYSTORE_FILE="$RUNNER_TEMP/upload.keystore"
  ./gradlew assembleDebug bundleRelease --no-daemon
  cp app/build/outputs/bundle/release/app-release.aab "../out/DoenerPalast-${VER}-build${N}.aab"
  rm -f "$ANDROID_KEYSTORE_FILE"
else
  echo "Kein Upload-Schlüssel hinterlegt – baue nur die Test-APK."
  ./gradlew assembleDebug --no-daemon
fi
cp app/build/outputs/apk/debug/app-debug.apk "../out/DoenerPalast-${VER}-build${N}.apk"
cd ..
echo "VER=$VER" >> "${GITHUB_ENV:-/dev/null}"
ls -la out
