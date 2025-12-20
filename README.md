# Logbook - Workout & Habit Tracker

A minimal, iPhone-first web app for tracking workouts and daily habits with GitHub-style activity heatmaps.

## Features

- **GitHub-style Activity Heatmaps** - Visualize your workout and habit consistency over the past year
- **Quick Exercise Logging** - Tap an exercise, choose weight/reps/sets from quick presets
- **Custom Habit Tracking** - Create pills for habits (Yes/No) or health metrics (with values)
- **Smart Presets** - Auto-fill from your last workout with quick-select buttons

## Getting Started

### Prerequisites

- Node.js 20.11.0 or higher
- A Supabase project

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/himanshuain/workoutLogger.git
   cd workoutLogger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor to create the necessary tables.

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Schema

| Table | Purpose |
|-------|---------|
| `exercises` | Predefined + custom exercises |
| `exercise_logs` | Logged exercises (date, weight, reps, sets) |
| `exercise_history` | Last used values for quick presets |
| `trackables` | Custom habits & health metrics to track |
| `tracking_entries` | Daily tracking entries |
| `user_settings` | Units (kg/lb), preferences |

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **PWA**: Installable on iOS/Android

## Project Structure

```
src/
├── components/
│   ├── Layout.js           # Bottom nav layout
│   ├── ActivityHeatmap.js  # GitHub-style heatmap
│   ├── HabitPills.js       # Habit/health tracking pills
│   ├── ExerciseLogModal.js # Exercise input with presets
│   └── Stepper.js          # +/- number input
├── context/
│   └── WorkoutContext.js   # Global state
├── lib/
│   └── supabase.js         # Supabase client
├── pages/
│   ├── index.js            # Home with heatmaps + pills
│   ├── history.js          # Exercise history
│   ├── settings.js         # Settings + pill management
│   └── auth.js             # Authentication
└── styles/
    └── globals.css         # Tailwind + animations
```

## License

MIT
