export type ProjectProgress = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

export function computeProjectProgress(taskStatuses: string[]): ProjectProgress {
  const totalCount = taskStatuses.length;
  const completedCount = taskStatuses.filter((status) => status === "COMPLETED").length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}
