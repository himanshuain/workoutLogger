import { useRouter } from "next/router";
import { useWorkoutAuthContext } from "@/context/contexts/WorkoutAuthContext";
import { Dumbbell } from "lucide-react";

/** Blocks unauthenticated UI until Supabase finishes restoring the session. */
export default function AuthBootstrapGate({ children }) {
  const router = useRouter();
  const { authReady, user } = useWorkoutAuthContext();

  if (router.pathname === "/auth") {
    return children;
  }

  if (!authReady && !user) {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center bg-iron-950 text-iron-400"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-card animate-pulse bg-lift-primary/20">
          <Dumbbell className="h-8 w-8 text-lift-primary" aria-hidden />
        </div>
      </div>
    );
  }

  return children;
}
