// Exercise SVG icons - simple silhouette illustrations
// Maps exercise names (lowercase) to their icon components

const exerciseIcons = {
  // Chest
  "bench press": BenchPressIcon,
  "incline bench press": InclineBenchIcon,
  "decline bench press": DeclineBenchIcon,
  "dumbbell press": DumbbellPressIcon,
  "chest fly": ChestFlyIcon,
  "push up": PushUpIcon,
  "push-up": PushUpIcon,
  pushup: PushUpIcon,
  "cable fly": ChestFlyIcon,

  // Back
  deadlift: DeadliftIcon,
  "barbell row": RowIcon,
  "bent over row": RowIcon,
  "dumbbell row": RowIcon,
  "lat pulldown": LatPulldownIcon,
  "pull up": PullUpIcon,
  "pull-up": PullUpIcon,
  pullup: PullUpIcon,
  "chin up": PullUpIcon,
  "chin-up": PullUpIcon,
  "seated row": SeatedRowIcon,
  "cable row": SeatedRowIcon,
  "t-bar row": RowIcon,

  // Shoulders
  "shoulder press": ShoulderPressIcon,
  "overhead press": ShoulderPressIcon,
  "military press": ShoulderPressIcon,
  "dumbbell shoulder press": ShoulderPressIcon,
  "lateral raise": LateralRaiseIcon,
  "side lateral raise": LateralRaiseIcon,
  "front raise": FrontRaiseIcon,
  "rear delt fly": RearDeltIcon,
  "face pull": FacePullIcon,
  shrug: ShrugIcon,

  // Arms
  "bicep curl": BicepCurlIcon,
  "barbell curl": BicepCurlIcon,
  "dumbbell curl": BicepCurlIcon,
  "hammer curl": HammerCurlIcon,
  "preacher curl": PreacherCurlIcon,
  "tricep extension": TricepExtensionIcon,
  "tricep pushdown": TricepPushdownIcon,
  "skull crusher": SkullCrusherIcon,
  "tricep dip": DipIcon,
  dip: DipIcon,

  // Legs
  squat: SquatIcon,
  "barbell squat": SquatIcon,
  "back squat": SquatIcon,
  "front squat": SquatIcon,
  "goblet squat": SquatIcon,
  "leg press": LegPressIcon,
  "leg extension": LegExtensionIcon,
  "leg curl": LegCurlIcon,
  "hamstring curl": LegCurlIcon,
  lunge: LungeIcon,
  "walking lunge": LungeIcon,
  "bulgarian split squat": LungeIcon,
  "calf raise": CalfRaiseIcon,
  "romanian deadlift": RomanianDeadliftIcon,
  "hip thrust": HipThrustIcon,

  // Core
  plank: PlankIcon,
  crunch: CrunchIcon,
  "sit up": CrunchIcon,
  "sit-up": CrunchIcon,
  "leg raise": LegRaiseIcon,
  "hanging leg raise": LegRaiseIcon,
  "russian twist": RussianTwistIcon,
  "ab wheel": AbWheelIcon,
};

export default function ExerciseIcon({
  name,
  className = "w-8 h-8",
  color = "currentColor",
}) {
  const normalizedName = name?.toLowerCase()?.trim() || "";

  // Try exact match first
  let IconComponent = exerciseIcons[normalizedName];

  // If no exact match, try partial match
  if (!IconComponent) {
    for (const [key, icon] of Object.entries(exerciseIcons)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        IconComponent = icon;
        break;
      }
    }
  }

  // Default to dumbbell icon
  if (!IconComponent) {
    IconComponent = DefaultExerciseIcon;
  }

  return <IconComponent className={className} color={color} />;
}

// Individual exercise icons - simple, clean silhouettes

function BenchPressIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 32h48M8 32v-4h4v8H8v-4zm48 0v-4h-4v8h4v-4z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="40" rx="12" ry="4" stroke={color} strokeWidth="2" />
      <path
        d="M24 40v8M40 40v8M20 48h8M36 48h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M26 32l-2-8h16l-2 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function InclineBenchIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 28h48M8 28v-4h4v8H8v-4zm48 0v-4h-4v8h4v-4z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 48l8-16h8l8 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 28l4-8 8 0 4 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="16" r="4" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function DeclineBenchIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 36h48M8 36v-4h4v8H8v-4zm48 0v-4h-4v8h4v-4z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 28l8 16h8l8-16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 36l4 8h8l4-8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="48" r="4" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function DumbbellPressIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="12"
        y="26"
        width="8"
        height="12"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="44"
        y="26"
        width="8"
        height="12"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M20 32h24"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="44" rx="10" ry="4" stroke={color} strokeWidth="2" />
      <path
        d="M26 44v6M38 44v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChestFlyIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="8"
        y="28"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="50"
        y="28"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M14 32c6-8 12-8 18-2M50 32c-6-8-12-8-18-2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="44" rx="10" ry="4" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="22" r="4" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function PushUpIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="32" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M16 32h8l20 4h8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 32v12M44 36v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 44h8M40 44h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeadliftIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 16v12" stroke={color} strokeWidth="2.5" />
      <path d="M24 28h16" stroke={color} strokeWidth="2" />
      <path
        d="M28 28v16l-4 8M36 28v16l4 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 44h48M8 44v-3h6v6H8v-3zm48 0v-3h-6v6h6v-3z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RowIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M20 20v4l12 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 24l-4 20M28 32l8 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 48h48M8 48v-3h6v6H8v-3zm48 0v-3h-6v6h6v-3z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LatPulldownIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8h40"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M32 8v8" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v8" stroke={color} strokeWidth="2.5" />
      <path
        d="M24 16l-8-4M40 16l8-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 32v16l-4 6M36 32v16l4 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="24"
        y="44"
        width="16"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function PullUpIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 8h40" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M20 8v8M44 8v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v12" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 16l8 4M44 16l-8 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SeatedRowIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="24" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M20 28v8h8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 36v12M24 36l8 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="40"
        y="28"
        width="12"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M28 36h12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShoulderPressIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="24" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 28v12" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 40v12M36 40v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="24"
        y="44"
        width="16"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M8 12h48M8 12v-3h4v6H8v-3zm48 0v-3h-4v6h4v-3z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 20l-12-8M40 20l12-8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LateralRaiseIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 20v16" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="22"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="50"
        y="22"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M28 24l-14 2M36 24l14 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FrontRaiseIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v16" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 40v12M36 40v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="26"
        y="8"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M29 16v8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RearDeltIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M32 20l-8 16h16l-8-16z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 36v12M40 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="28"
        width="6"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="50"
        y="28"
        width="6"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M24 28l-10 3M40 28l10 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FacePullIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v12" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8 8h4v8H8zM52 8h4v8h-4z" stroke={color} strokeWidth="2" />
      <path
        d="M12 12h8l8 8M52 12h-8l-8 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShrugIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M32 16v4c0 4-4 6-8 6s-8-2-8-6v-4M32 16v4c0 4 4 6 8 6s8-2 8-6v-4"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M16 26v16l-4 6M48 26v16l4 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="10"
        y="42"
        width="8"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="46"
        y="42"
        width="8"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function BicepCurlIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 16v20" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M36 24v-8c0-2 2-4 6-4h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="44"
        y="8"
        width="6"
        height="10"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function HammerCurlIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 16v20" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M36 24v-8l8 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="44"
        y="12"
        width="8"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function PreacherCurlIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M24 20v4l12 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M36 36l8-8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="42"
        y="24"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M16 24v20h24l4-12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TricepExtensionIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 20v16" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="28"
        y="4"
        width="8"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M28 20l4-10M36 20l-4-10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TricepPushdownIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v12" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 8h40"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M32 8v4" stroke={color} strokeWidth="2" />
      <path
        d="M28 24l-4-12M36 24l4-12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SkullCrusherIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="32" cy="40" rx="12" ry="4" stroke={color} strokeWidth="2" />
      <path
        d="M24 40v8M40 40v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="48" cy="28" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M28 36l-4-8h32"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M8 20h12M8 20v-3h4v6H8v-3z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DipIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 16v20" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v12M36 36v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 20h16M40 20h16"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M24 20l4 8M40 20l-4 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SquatIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 16v8" stroke={color} strokeWidth="2.5" />
      <path
        d="M8 12h48M8 12v-3h6v6H8v-3zm48 0v-3h-6v6h6v-3z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 24l-6 16 4 8M40 24l6 16-4 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M28 24h8" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function LegPressIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M16 24l8 8v12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 44l20-8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="44"
        y="32"
        width="12"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M12 24v20h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LegExtensionIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M20 24v12h8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M28 36h20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="48"
        y="32"
        width="8"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M16 36v12h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LegCurlIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="48" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M48 24v4h-32"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 28l-4 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="44"
        width="8"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M44 28v20h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LungeIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="28" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M28 16v12" stroke={color} strokeWidth="2.5" />
      <path
        d="M24 28l-12 16v4M32 28l16 8v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="44"
        y="44"
        width="8"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="8"
        y="44"
        width="8"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function CalfRaiseIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="8" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 12v24" stroke={color} strokeWidth="2.5" />
      <path
        d="M28 36v8l-4 4M36 36v8l4 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 48h24"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M16 52h32" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function RomanianDeadliftIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="16" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M24 20l8 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 20l-4 28M28 20l12 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 48h48M8 48v-3h6v6H8v-3zm48 0v-3h-6v6h6v-3z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HipThrustIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="28" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M16 28h20l8-8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M36 28l8 12M44 20l8 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="48"
        y="28"
        width="8"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M8 24v20h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="24"
        y="20"
        width="16"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function PlankIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="32" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M16 32h36"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 32v8M48 32v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="16"
        y="40"
        width="8"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="44"
        y="40"
        width="8"
        height="4"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function CrunchIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M24 24l8 16h20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 40l-8 8M52 40v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 24l-8 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LegRaiseIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 8h40" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M20 8v8M44 8v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path d="M32 24v8" stroke={color} strokeWidth="2.5" />
      <path
        d="M20 16l8 8M44 16l-8 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 32h8l4 16M36 48h-8l-4-16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RussianTwistIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="20" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M32 24v8l-8 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 44l16 4M40 48l8-12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="24"
        width="8"
        height="6"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M28 28l-12 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AbWheelIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="28" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M16 28h24"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="36" r="12" stroke={color} strokeWidth="2" />
      <circle cx="48" cy="36" r="4" fill={color} />
      <path
        d="M12 32v12M40 28l-4 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DefaultExerciseIcon({ className, color }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="8"
        y="26"
        width="10"
        height="12"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="46"
        y="26"
        width="10"
        height="12"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="14"
        y="28"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="44"
        y="28"
        width="6"
        height="8"
        rx="1"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M20 32h24"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Export individual icons for direct use
export {
  BenchPressIcon,
  SquatIcon,
  DeadliftIcon,
  ShoulderPressIcon,
  BicepCurlIcon,
  PullUpIcon,
  RowIcon,
  LungeIcon,
  PlankIcon,
  DefaultExerciseIcon,
};
