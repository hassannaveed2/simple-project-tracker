"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormSheet } from "./task-form-sheet";

export function AddTaskButton({
  projects,
  defaultProjectId,
  label = "Add Task",
}: {
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <TaskFormSheet
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
