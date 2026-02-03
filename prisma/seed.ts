import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoPassword = await hash("demo123", 12);

  await prisma.user.upsert({
    where: { email: "admin@opsdesk.local" },
    update: {},
    create: {
      email: "admin@opsdesk.local",
      passwordHash: demoPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "agent@opsdesk.local" },
    update: {},
    create: {
      email: "agent@opsdesk.local",
      passwordHash: demoPassword,
      name: "Agent User",
      role: "AGENT",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@opsdesk.local" },
    update: {},
    create: {
      email: "user@opsdesk.local",
      passwordHash: demoPassword,
      name: "End User",
      role: "USER",
    },
  });

  console.log(
    "Seed complete. Demo users: admin@opsdesk.local, agent@opsdesk.local, user@opsdesk.local — password: demo123"
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
