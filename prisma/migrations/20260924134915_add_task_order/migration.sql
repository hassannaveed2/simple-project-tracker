-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_projectId_status_order_idx" ON "Task"("projectId", "status", "order");

-- Backfill order using the pre-existing de facto sort (priority desc, dueDate asc, createdAt
-- asc), per (projectId, status) column, so existing boards look unchanged until a user drags
-- something.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "projectId", "status"
           ORDER BY "priority" DESC, "dueDate" ASC NULLS LAST, "createdAt" ASC
         ) - 1 AS rn
  FROM "Task"
)
UPDATE "Task"
SET "order" = ranked.rn
FROM ranked
WHERE "Task".id = ranked.id;
