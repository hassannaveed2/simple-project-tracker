"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormSheet } from "./project-form-sheet";

export function NewProjectButton({ label = "New Project" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <ProjectFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
