import { PrismaClient, TaskPriority, TaskStatus, ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Jack",
      password: passwordHash,
    },
  });

  const clientWebsite = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Client Website",
      description: "Marketing site redesign for a client.",
      color: "#6366f1",
      status: ProjectStatus.ACTIVE,
      tasks: {
        create: [
          {
            userId: user.id,
            title: "Fix homepage header",
            status: TaskStatus.TODO,
            priority: TaskPriority.HIGH,
            dueDate: new Date(),
          },
          {
            userId: user.id,
            title: "Replace hero image",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Add contact form",
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Deploy to staging",
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.LOW,
            completedAt: new Date(),
          },
        ],
      },
    },
  });

  const personalWebsite = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Personal Website",
      description: "Portfolio and blog.",
      color: "#22c55e",
      status: ProjectStatus.ACTIVE,
      tasks: {
        create: [
          {
            userId: user.id,
            title: "Add portfolio section",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Update About page",
            status: TaskStatus.TODO,
            priority: TaskPriority.LOW,
          },
        ],
      },
    },
  });

  console.log(
    `Seeded user ${user.email} with projects: ${clientWebsite.name}, ${personalWebsite.name}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
