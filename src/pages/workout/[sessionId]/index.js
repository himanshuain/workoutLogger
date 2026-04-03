import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Legacy URL: workout session UI now lives on Home (Today) + exercise logger routes.
 */
export default function WorkoutSessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-iron-950">
      <div className="w-8 h-8 border-2 border-lift-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
