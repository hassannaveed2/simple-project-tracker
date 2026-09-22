"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { UpcomingTaskRow, type UpcomingTaskData } from "./upcoming-task-row";

// Task due dates are stored as UTC-midnight instants (see lib/format-due-date.ts). The calendar
// widget compares days in the browser's local timezone, so each date's UTC year/month/day is
// re-anchored onto local midnight here — otherwise a task due "Sep 22" could render under Sep 21
// on the calendar for viewers west of UTC.
function toLocalMidnight(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function DashboardCalendar({ tasks }: { tasks: UpcomingTaskData[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const taskDates = useMemo(() => tasks.map((task) => toLocalMidnight(task.dueDate)), [tasks]);

  const tasksOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    // selectedDate comes straight from react-day-picker as local midnight for the clicked day —
    // it must NOT be passed through toLocalMidnight again (that function assumes a UTC-anchored
    // input, like task.dueDate; re-running it on an already-local date shifts the day by however
    // far the browser's timezone offset is from UTC).
    const selectedTime = selectedDate.getTime();
    return tasks.filter((task) => toLocalMidnight(task.dueDate).getTime() === selectedTime);
  }, [tasks, selectedDate]);

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ hasTask: taskDates }}
        modifiersClassNames={{ hasTask: "font-bold underline" }}
        className="rounded-lg border"
      />
      {selectedDate ? (
        <div className="space-y-2">
          {tasksOnSelectedDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks due this day.</p>
          ) : (
            tasksOnSelectedDate.map((task) => <UpcomingTaskRow key={task.id} task={task} />)
          )}
        </div>
      ) : null}
    </div>
  );
}
