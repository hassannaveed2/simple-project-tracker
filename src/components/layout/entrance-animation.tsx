"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_STORAGE_KEY = "show-entrance-animation";
const HOLD_MS = 2000;
const EXIT_MS = 400;

export function markEntranceAnimationForNextLoad() {
  sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
}

export function EntranceAnimation() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "exiting">("hidden");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_STORAGE_KEY)) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setPhase("visible");
    }
  }, []);

  useEffect(() => {
    if (phase !== "visible") return;
    const timer = setTimeout(() => setPhase("exiting"), HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => setPhase("hidden"), EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background",
        phase === "exiting" ? "animate-out fade-out duration-400" : "animate-in fade-in duration-300"
      )}
    >
      <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 fade-in duration-700">
        <ListChecks className="size-12 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Task Tracker</h1>
      </div>
    </div>
  );
}
