# Logbook iOS (SwiftUI)

Minimal native iOS shell for workout-logger. Use this to verify device install before building the real UI.

## First-time install on your iPhone

1. Connect your iPhone to your Mac with a USB cable.
2. Unlock the phone and tap **Trust This Computer** if prompted.
3. Open the project:
   ```bash
   open ios/Logbook.xcodeproj
   ```
4. In Xcode, select the **Logbook** target → **Signing & Capabilities**.
5. Set **Team** to your Apple ID (Personal Team is fine for testing).
6. At the top of Xcode, pick your **iPhone** as the run destination (not a simulator).
7. Press **Run** (▶) or `Cmd+R`.

On first install with a free Apple ID, you may also need on the iPhone:

**Settings → General → VPN & Device Management → Developer App → Trust**

## Reinstall (one command)

Plug in your iPhone, unlock it, then:

```bash
npm run ios:reinstall
```

This will:

1. Turn **WARP off** (needed for reliable USB/Xcode device connection)
2. Build and install **Logbook**
3. Turn **WARP back on** when finished (success or failure)

A progress bar runs for the whole flow. Xcode does not need to be open.

Requires `IOS_DEVELOPMENT_TEAM` and `IOS_DEVICE_ID` in `.env.local` (already set if you installed once via Xcode).

## Simulator dev (auto UI updates)

For **iPhone 17 Pro Max simulator** with hot reload while editing SwiftUI:

```bash
npm run ios:sim
# or from anywhere: logsim
```

1. Boots the simulator and runs Logbook
2. **With [InjectionIII](https://github.com/johnno1962/InjectionIII/releases)** (recommended): save any `.swift` file → UI updates in ~1 second on the simulator
   - First time: in InjectionIII → **Open Project** → select `ios/Logbook.xcodeproj`
   - Run once from Xcode (▶) or via `logsim`, then just save Swift files
3. **Without InjectionIII**: the script watches Swift files and auto-rebuilds (slower, ~10–20s per save)

You can also use Xcode **Canvas previews** (`#Preview` in `ContentView.swift`) for instant feedback without the simulator.

## Project layout

```
ios/
├── Logbook/
│   ├── LogbookApp.swift
│   ├── ContentView.swift          # Login + live workout UI
│   ├── NativeAuthStore.swift      # Email + Google OAuth
│   ├── SupabaseClient.swift       # REST + RPC + DTOs
│   ├── Models/NativeWorkoutModels.swift
│   ├── Services/WorkoutDataService.swift
│   ├── Store/WorkoutStore.swift   # Live data + refresh state
│   └── Utilities/
│       ├── WorkoutMapper.swift
│       ├── WorkoutCalculations.swift
│       └── ExerciseMediaResolver.swift
├── LogbookTests/
│   └── WorkoutCalculationsTests.swift
└── Logbook.xcodeproj/
```

## Live Supabase data

After sign-in, the app calls `get_user_init_data` (same RPC as the PWA) and maps:

- `workout_routines` → split tabs
- `routine_exercises` → exercise grid
- `exercises` + media overrides → `AsyncImage` thumbnails
- `workout_sessions` + `set_logs` → today’s logged sets/stats
- `exercise_history` → default weight/reps in detail screen
- `user_settings.unit` → kg/lb pills and labels

Preview data is shown until live data loads successfully. Pull-to-refresh and foreground return both call `WorkoutStore.refresh()`.

**Still local-only (next pass):** edit/delete set, full workout completion/reset lifecycle, completed-session history, PWA sync verification.

Supabase keys are configured in the target Build Settings as `INFOPLIST_KEY_SUPABASE_URL` and `INFOPLIST_KEY_SUPABASE_ANON_KEY`.

Google sign-in uses the native callback `logbook://auth-callback`. Add this exact URL in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.

## Quick smoke test

After launching the app, verify:

1. The profile-style screen shows split tabs, stats, and an exercise collage.
2. Tap **Bench Press** and confirm the detail screen opens with weight/reps pills and history.
3. Choose a weight and reps, then tap **Log set**. The history and exercise tile should update.
4. Return to the grid and switch between **Push**, **Pull**, and **Legs**. Stats should change with the selected split.
5. Tap the reset button in the top-right corner and confirm the active split returns to its initial state.

## Next steps

- Replace `ContentView.swift` with real navigation and screens
- Load the web app in `WKWebView`, or rebuild flows natively in SwiftUI
- Add app icon images to `AppIcon.appiconset` (1024×1024 source)
