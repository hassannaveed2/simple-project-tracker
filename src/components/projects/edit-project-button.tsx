"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormSheet } from "./project-form-sheet";
import type { ProjectInput } from "@/lib/validations/project";

export function EditProjectButton({ project }: { project: { id: string } & ProjectInput }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit Project
      </Button>
      <ProjectFormSheet open={open} onOpenChange={setOpen} project={project} />
    </>
  );
}
