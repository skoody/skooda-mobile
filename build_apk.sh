#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export NDK_HOME=/opt/android-sdk/ndk/29.0.14206865
export PATH=$PATH:$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin

# Symlink Hack für den Compiler
mkdir -p .bin
ln -sf $NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang .bin/aarch64-linux-android-clang
ln -sf $NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang++ .bin/aarch64-linux-android-clang++
export PATH=$PWD/.bin:$PATH

# Cargo Linker Settings
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER=$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang

echo "🚀 Starte APK Build v0.8.3 (Professional Cyber Tools Upgrade)..."
npx tauri android build --apk --ci
cp src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk skooda-mobile.apk
echo "✅ Build fertig: skooda-mobile.apk"
