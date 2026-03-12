# 🏋️ Logbook - Workout & Habit Tracker

<div align="center">

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║    ██╗      ██████╗  ██████╗ ██████╗  ██████╗  ██████╗ ██╗  ██╗  ║
║    ██║     ██╔═══██╗██╔════╝ ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝  ║
║    ██║     ██║   ██║██║  ███╗██████╔╝██║   ██║██║   ██║█████╔╝   ║
║    ██║     ██║   ██║██║   ██║██╔══██╗██║   ██║██║   ██║██╔═██╗   ║
║    ███████╗╚██████╔╝╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝██║  ██╗  ║
║    ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝  ║
║                                                                  ║
║         Your Personal Workout & Habit Tracking Companion         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**A minimal, mobile-first Progressive Web App for tracking workouts, habits, and nutrition**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

[![Watch Demo Video](https://img.shields.io/badge/🎬_Watch_Demo-Loom_Video-blueviolet?style=for-the-badge&logo=loom)](https://www.loom.com/share/e39f013942ff4022ab80190e777d6394)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [User Flows](#-user-flows)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Theming](#-theming)
- [Tech Stack](#-tech-stack)
- [Security](#-security)
- [License](#-license)

---

## ✨ Features

### 🏋️ Workout Routines

- **Create custom workout routines** for each day of the week
- **Set-by-set logging** with progressive overload tracking
- **Previous workout data** shown for each exercise
- **Swipe navigation** between exercises during workout

### 📊 Progress Tracking

- **GitHub-style activity heatmaps** - Visualize workout consistency
- **Progressive overload graphs** - Track weight progression per exercise
- **Weekly overview table** - See habits, workouts, and food at a glance
- **Streak tracking** - Stay motivated with current streak count

### ✅ Habit Tracking

- **Custom habit pills** - Track any Yes/No habit (💧 Water, 💊 Supplements, etc.)
- **Health metrics** - Track values like sleep hours, mood score
- **Quick toggle** - Tap to complete, long-press for values

### 🍎 Food Tracking

- **Custom food items** - Track daily nutrition intake
- **Quantity tracking** - Log servings/quantities
- **Calendar view** - See what you ate each day

### 📅 Life Log (NEW!)

- **Track occasional events** - Haircuts, doctor visits, car service, etc.
- **See "X days ago"** - Instantly know when you last did something
- **Reminder highlights** - Events are highlighted when overdue
- **Full history** - View all past occurrences of any event
- **Optional notes & cost** - Add details to each log entry

### 🎨 Themes

- **🦇 Batman (Dark)** - Dark grays with yellow/gold accents
- **🕷️ Spiderman (Light)** - Clean whites with red/blue accents

---

## 📱 Screenshots

## <video controls src="Screen Recording 2025-12-26 at 7.18.02 PM-1.mov" title="Title" width="300"></video>

<img src="Screenshot 2025-12-26 at 7.33.32 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.33.28 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.33.16 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.33.04 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.32.46 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.32.38 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.32.20 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.32.12 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.31.57 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.31.31 PM.png" width="200" /> <img src="Screenshot 2025-12-26 at 7.31.17 PM.png" width="200" />

## 🏗 Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/PWA)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   Next.js   │  │  React      │  │  Tailwind   │  │  PWA     │ │
│  │   Pages     │  │  Context    │  │  CSS        │  │  Support │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └──────────┘ │
│         │                │                                        │
│         └────────┬───────┘                                        │
│                  │                                                │
│         ┌────────▼────────┐                                       │
│         │  WorkoutContext │ ◄──── Global State Management         │
│         │  ThemeContext   │                                       │
│         └────────┬────────┘                                       │
│                  │                                                │
└──────────────────┼────────────────────────────────────────────────┘
                   │
                   │ HTTPS (Supabase JS Client)
                   │
┌──────────────────▼────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐ │
│  │  Authentication │    │   PostgreSQL    │    │ Row Level     │ │
│  │  (Email/Pass)   │    │   Database      │    │ Security      │ │
│  └─────────────────┘    └─────────────────┘    └───────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                                 │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                     REACT COMPONENTS                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Home    │  │ Routines │  │ Progress │  │ Settings │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │             │                  │
│       └──────────┬──┴─────────────┴─────────────┘                  │
│                  │                                                  │
│                  ▼                                                  │
│         ┌────────────────┐                                         │
│         │ WorkoutContext │                                         │
│         │    (State)     │                                         │
│         └───────┬────────┘                                         │
│                 │                                                   │
└─────────────────┼──────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT                                  │
│         ┌─────────────────────────────────┐                        │
│         │  supabase.from('table')         │                        │
│         │    .select() / .insert()        │                        │
│         │    .update() / .delete()        │                        │
│         └───────────────┬─────────────────┘                        │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL + RLS                                 │
│                                                                     │
│   SELECT * FROM exercise_logs WHERE user_id = auth.uid()           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │    auth.users    │
                         │  (Supabase Auth) │
                         └────────┬─────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  user_settings   │   │   trackables     │   │  workout_routines│
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ user_id (FK)     │   │ user_id (FK)     │   │ user_id (FK)     │
│ unit (kg/lb)     │   │ name             │   │ name             │
│ dark_mode        │   │ type (habit/     │   │ day_of_week (0-6)│
└──────────────────┘   │      health)     │   │ color            │
                       │ icon             │   └────────┬─────────┘
                       │ color            │            │
                       │ has_value        │            ▼
                       │ value_unit       │   ┌──────────────────┐
                       └────────┬─────────┘   │routine_exercises │
                                │             ├──────────────────┤
                                ▼             │ routine_id (FK)  │
                       ┌──────────────────┐   │ exercise_name    │
                       │ tracking_entries │   │ category         │
                       ├──────────────────┤   │ target_sets      │
                       │ trackable_id (FK)│   │ order_index      │
                       │ date             │   └──────────────────┘
                       │ is_completed     │
                       │ value            │
                       └──────────────────┘


┌──────────────────┐          ┌──────────────────┐
│    exercises     │          │ workout_sessions │
├──────────────────┤          ├──────────────────┤
│ name             │          │ user_id (FK)     │
│ category         │          │ routine_id (FK)  │
│ is_custom        │          │ routine_name     │
└──────────────────┘          │ date             │
                              │ status (active/  │
                              │   completed)     │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │    set_logs      │
                              ├──────────────────┤
                              │ session_id (FK)  │
                              │ exercise_name    │
                              │ set_number       │
                              │ weight           │
                              │ reps             │
                              │ is_completed     │
                              │ previous_weight  │
                              │ previous_reps    │
                              └──────────────────┘


┌──────────────────┐          ┌──────────────────┐
│   food_items     │          │  food_entries    │
├──────────────────┤          ├──────────────────┤
│ user_id (FK)     │◄─────────│ food_item_id(FK) │
│ name             │          │ user_id (FK)     │
│ icon             │          │ date             │
│ color            │          │ quantity         │
│ order_index      │          │ is_completed     │
└──────────────────┘          └──────────────────┘


┌──────────────────┐          ┌──────────────────┐
│  exercise_logs   │          │ exercise_history │
├──────────────────┤          ├──────────────────┤
│ user_id (FK)     │          │ user_id (FK)     │
│ exercise_name    │          │ exercise_name    │
│ date             │          │ last_weight      │
│ weight           │          │ last_reps        │
│ reps             │          │ last_sets        │
│ sets             │          │ personal_record  │
└──────────────────┘          │ times_performed  │
(Legacy logging)              └──────────────────┘


┌──────────────────┐          ┌──────────────────┐
│   event_types    │          │   event_logs     │
├──────────────────┤          ├──────────────────┤
│ user_id (FK)     │◄─────────│ event_type_id(FK)│
│ name             │          │ user_id (FK)     │
│ icon             │          │ date             │
│ color            │          │ notes            │
│ reminder_days    │          │ cost             │
│ description      │          └──────────────────┘
└──────────────────┘
(Life Log feature)
```

### Tables Summary

| Table               | Purpose                          | Key Fields                 |
| ------------------- | -------------------------------- | -------------------------- |
| `exercises`         | Predefined + custom exercises    | name, category             |
| `workout_routines`  | Workout plans for each day       | name, day_of_week          |
| `routine_exercises` | Exercises in each routine        | exercise_name, target_sets |
| `workout_sessions`  | Individual workout instances     | date, status               |
| `set_logs`          | Set-by-set logging               | weight, reps, is_completed |
| `exercise_history`  | Last used values (smart presets) | last_weight, last_reps     |
| `trackables`        | Custom habits & health metrics   | name, type, icon           |
| `tracking_entries`  | Daily habit completions          | is_completed, value        |
| `food_items`        | Custom food items to track       | name, icon                 |
| `food_entries`      | Daily food log                   | quantity, date             |
| `event_types`       | Life Log event types             | name, icon, reminder_days  |
| `event_logs`        | Life Log occurrences             | date, notes, cost          |
| `user_settings`     | User preferences                 | unit (kg/lb), dark_mode    |

---

## 🔄 User Flows

### Workout Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKOUT SESSION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────┐          ┌─────────────┐         ┌──────────────┐
     │  Home   │          │  Start      │         │   Workout    │
     │  Page   │ ───────► │  Workout    │ ──────► │   Session    │
     └─────────┘          └─────────────┘         └──────┬───────┘
          │                                              │
          │                                              ▼
          │                                    ┌──────────────────┐
          │                                    │  Exercise View   │
          │                                    │  ┌────────────┐  │
          │                                    │  │ Set 1: ✓   │  │
          │                                    │  │ Set 2: ⬜   │  │
          │                                    │  │ Set 3: ⬜   │  │
          │                                    │  └────────────┘  │
          │                                    │                  │
          │                                    │  [◄] [►] (swipe) │
          │                                    └────────┬─────────┘
          │                                             │
          │         ┌───────────────────────────────────┘
          │         │
          │         ▼
          │    ┌─────────────┐      ┌──────────────────┐
          │    │  Complete   │      │  Update History  │
          │    │  Workout    │ ───► │  (exercise_      │
          │    └─────────────┘      │   history table) │
          │                         └────────┬─────────┘
          │                                  │
          ▼                                  ▼
     ┌─────────────────────────────────────────────────┐
     │                 Progress Page                    │
     │                                                  │
     │   ████████░░░░  Heatmap shows workout           │
     │   ██████████░░  Session counts as completed     │
     │                                                  │
     └─────────────────────────────────────────────────┘
```

### Habit Tracking Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HABIT TRACKING FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │  Home Page   │
     │              │
     │  Habit Pills │
     │  ┌────────┐  │
     │  │ 💧 Water│◄─────────┐
     │  └────────┘  │        │
     │  ┌────────┐  │        │
     │  │ 💊 Supps│  │        │ Tap to toggle
     │  └────────┘  │        │
     └──────┬───────┘        │
            │                │
            ▼                │
     ┌──────────────┐        │
     │  Tap Habit   │────────┘
     │  Pill        │
     └──────┬───────┘
            │
            ├────────────────────────────────────┐
            │                                    │
            ▼                                    ▼
     ┌──────────────┐                    ┌──────────────┐
     │ Simple Habit │                    │ Value Habit  │
     │ (Yes/No)     │                    │ (w/ number)  │
     │              │                    │              │
     │ Toggle ✓/✗   │                    │ Input Modal  │
     └──────┬───────┘                    │ [Enter value]│
            │                            └──────┬───────┘
            │                                   │
            └───────────────┬───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ tracking_    │
                    │ entries      │
                    │ updated      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Progress     │
                    │ Heatmap      │
                    │ Updated      │
                    └──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.11.0 or higher
- **npm** or **yarn**
- A **Supabase** project (free tier works!)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/himanshuain/workoutLogger.git
cd workoutLogger

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Database Setup

1. Go to your Supabase project → **SQL Editor**
2. Run the SQL from `supabase/schema.sql` (creates all tables)
3. Run the SQL from `supabase/migration-v3.sql` (adds routine tables)

```bash
# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Install as PWA

On mobile:

1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap **Share** → **Add to Home Screen**
3. The app will work offline and feel like a native app!

---

## 📁 Project Structure

```
workout-logger/
├── 📁 public/
│   ├── icons/              # PWA icons
│   └── manifest.json       # PWA manifest
│
├── 📁 src/
│   ├── 📁 components/
│   │   ├── Layout.js           # Bottom navigation layout
│   │   ├── ActivityHeatmap.js  # GitHub-style heatmap
│   │   ├── TrackingOverview.js # Weekly overview table
│   │   ├── ProgressGraph.js    # Exercise progress charts
│   │   ├── HabitPills.js       # Habit tracking pills
│   │   ├── QuickStats.js       # Home page stats cards
│   │   ├── SetCard.js          # Workout set logging card
│   │   ├── CollapsibleSection.js
│   │   └── 📁 ui/
│   │       └── drawer.jsx      # Radix drawer component
│   │
│   ├── 📁 context/
│   │   ├── WorkoutContext.js   # Global state (user, data, CRUD)
│   │   └── ThemeContext.js     # Theme state (dark/light)
│   │
│   ├── 📁 lib/
│   │   ├── supabase.js         # Supabase client
│   │   └── notifications.js    # Push notifications
│   │
│   ├── 📁 pages/
│   │   ├── index.js            # Home (today's workout + habits)
│   │   ├── routines.js         # Manage workout routines
│   │   ├── workout/[sessionId].js  # Active workout session
│   │   ├── progress.js         # Heatmaps + stats
│   │   ├── history.js          # Exercise history
│   │   ├── food.js             # Food tracking
│   │   ├── settings.js         # Settings + theme toggle
│   │   ├── auth.js             # Login/Register
│   │   └── _app.js             # App wrapper (providers)
│   │
│   └── 📁 styles/
│       └── globals.css         # Tailwind + CSS variables
│
├── 📁 supabase/
│   ├── schema.sql              # Main database schema
│   └── migration-v3.sql        # Workout routines migration
│
├── tailwind.config.js          # Tailwind + theme colors
├── next.config.js              # Next.js config
└── package.json
```

---

## 🎨 Theming

The app features two distinct themes inspired by superheroes:

### 🦇 Batman Theme (Dark Mode)

```css
/* Dark grays + Yellow/Gold accent */
--bg-primary: #0a0a0b;
--bg-card: #1c1c1e;
--accent-primary: #fbbf24; /* Yellow */
--text-primary: #f4f4f5;
```

```
┌─────────────────────────────┐
│  🦇 BATMAN THEME            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓                       ▓  │
│  ▓  ██ Dark Background   ▓  │
│  ▓  ▓▓ Card Background   ▓  │
│  ▓  🟡 Yellow Accent     ▓  │
│  ▓                       ▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────┘
```

### 🕷️ Spiderman Theme (Light Mode)

```css
/* White/Slate + Red/Blue accents */
--bg-primary: #f8fafc;
--bg-card: #ffffff;
--accent-primary: #dc2626; /* Red */
--accent-secondary: #2563eb; /* Blue */
```

```
┌─────────────────────────────┐
│  🕷️ SPIDERMAN THEME         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░                       ░  │
│  ░  ░░ Light Background  ░  │
│  ░  ▒▒ White Cards       ░  │
│  ░  🔴 Red Primary       ░  │
│  ░  🔵 Blue Secondary    ░  │
│  ░                       ░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────┘
```

Toggle themes in **Settings** → **Theme Toggle**

---

## 🛠 Tech Stack

| Category             | Technology                           |
| -------------------- | ------------------------------------ |
| **Framework**        | Next.js 14 (Pages Router)            |
| **UI Library**       | React 18                             |
| **Styling**          | Tailwind CSS                         |
| **Database**         | Supabase (PostgreSQL)                |
| **Authentication**   | Supabase Auth                        |
| **State Management** | React Context                        |
| **Data Fetching**    | TanStack Query (React Query)         |
| **UI Components**    | Radix UI (Drawer, Dialog)            |
| **Icons**            | Lucide React                         |
| **Charts**           | Custom SVG + react-activity-calendar |
| **PWA**              | next-pwa                             |

---

## 🔐 Security

### Row Level Security (RLS)

All tables are protected with RLS policies:

```sql
-- Example: Users can only see their own data
CREATE POLICY "Users can view own data" ON exercise_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON exercise_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Data Isolation

```
┌───────────────────────────────────────────────────────────────┐
│                    SECURITY MODEL                              │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│   User A                           User B                      │
│   ┌─────────────┐                  ┌─────────────┐            │
│   │ user_id: A  │                  │ user_id: B  │            │
│   └──────┬──────┘                  └──────┬──────┘            │
│          │                                │                    │
│          ▼                                ▼                    │
│   ┌─────────────┐                  ┌─────────────┐            │
│   │  A's Data   │   🔒 ISOLATED 🔒  │  B's Data   │            │
│   │  - Workouts │                  │  - Workouts │            │
│   │  - Habits   │                  │  - Habits   │            │
│   │  - Settings │                  │  - Settings │            │
│   └─────────────┘                  └─────────────┘            │
│                                                                │
│   RLS Policy: WHERE user_id = auth.uid()                      │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

<div align="center">

**Built with ❤️ for fitness enthusiasts**

[Report Bug](https://github.com/himanshuain/workoutLogger/issues) · [Request Feature](https://github.com/himanshuain/workoutLogger/issues)

</div>
