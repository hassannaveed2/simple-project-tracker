"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  taskSchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskInput,
} from "@/lib/validations/task";
import { createTask, updateTask } from "@/actions/tasks";
import { DeleteTaskDialog } from "./delete-task-dialog";

// `dueDate` is stored as a plain "YYYY-MM-DD" string (see taskSchema) with no timezone info of
// its own. `Calendar` (react-day-picker) compares selected/displayed dates using the JS Date
// object's LOCAL year/month/day — so these must round-trip through LOCAL midnight, not through
// `new Date("YYYY-MM-DD")` (which parses as UTC midnight and can display as the previous day for
// timezones west of UTC) or `.toISOString()` (which can shift the day the other direction). Same
// underlying pitfall `dashboard-calendar.tsx`'s `toLocalMidnight` helper exists to avoid.
function parseDueDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

type TaskFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  task?: { id: string } & TaskInput;
};

export function TaskFormSheet({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  task,
}: TaskFormSheetProps) {
  const isEdit = !!task;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const emptyValues = useMemo<TaskInput>(
    () => ({
      title: "",
      description: "",
      notes: "",
      projectId: defaultProjectId,
      priority: "MEDIUM",
      status: "TODO",
      dueDate: "",
    }),
    [defaultProjectId]
  );

  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: task ?? emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(task ?? emptyValues);
    }
  }, [open, task, emptyValues, form]);

  async function onSubmit(values: TaskInput) {
    const result = task ? await updateTask(task.id, values) : await createTask(values);

    if (result.success) {
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Task" : "Add Task"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Fix homepage header" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full min-w-0 justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="size-4 shrink-0" />
                            <span className="truncate">
                              {field.value
                                ? format(parseDueDateString(field.value)!, "MMM d, yyyy")
                                : "Pick a date"}
                            </span>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={parseDueDateString(field.value)}
                          onSelect={(date) =>
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                          }
                        />
                        {field.value ? (
                          <div className="border-t p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange("")}
                            >
                              Clear date
                            </Button>
                          </div>
                        ) : null}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What needs to happen?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="flex-row px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add task"}
              </Button>
              {task ? (
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              ) : null}
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
        {task ? (
          <DeleteTaskDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            taskId={task.id}
            taskTitle={task.title}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
