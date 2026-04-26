# Monday Desktop — Tauri App

## Prerequisites

1. **Rust** — install via [rustup](https://rustup.rs/):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Tauri CLI** — install globally:
   ```bash
   cargo install tauri-cli --version "^2"
   ```

3. **macOS** — Xcode 15+ with command line tools:
   ```bash
   xcode-select --install
   ```

4. **Linux** — install dependencies:
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```

5. **Windows** — [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ desktop development workload.

## Development

```bash
cd tauri/
cargo tauri dev
```

This builds the Monday web app (via `npm run build`) and launches the Tauri window.

## Build

```bash
cd tauri/
cargo tauri build
```

Outputs:
- **macOS**: `src-tauri/target/release/bundle/macos/Monday.app` + `.dmg`
- **Windows**: `src-tauri/target/release/bundle/nsis/Monday_0.29.3_x64-setup.exe`
- **Linux**: `src-tauri/target/release/bundle/appimage/monday_0.29.3_amd64.AppImage`

## Architecture

- The Tauri shell hosts the Monday web app (built from `monday/dist/`)
- IndexedDB persists chat data locally (same as browser)
- WebGPU access delegated to the embedded WebView
- Offline support via the prebuilt app shell (same as PWA)
- Window state persistence via `tauri-plugin-window-state`
