"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export type SearchResult = {
  projects: { id: string; slug: string; name: string }[];
  tasks: { id: string; title: string; projectSlug: string; projectName: string }[];
};

const EMPTY_RESULT: SearchResult = { projects: [], tasks: [] };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export async function search(query: string): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_RESULT;

  const userId = await requireUserId();

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId, name: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, title: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, title: true, project: { select: { slug: true, name: true } } },
      take: 5,
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    projects,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      projectSlug: task.project.slug,
      projectName: task.project.name,
    })),
  };
}
