/**
 * Promote a user to ADMIN role by email address.
 *
 * Usage:
 *   pnpm tsx scripts/make-admin.ts <email>
 *
 * Example:
 *   pnpm tsx scripts/make-admin.ts fatima@example.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: pnpm tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`${user.name} (${email}) is already an admin.`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`${user.name} (${email}) has been promoted to ADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
