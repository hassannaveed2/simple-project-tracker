"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes can't know the persisted theme until after hydration; rendering a value before
  // that would mismatch between server and client. Render nothing until mounted, matching the
  // pattern next-themes' own docs recommend for theme-dependent UI.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="System" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
