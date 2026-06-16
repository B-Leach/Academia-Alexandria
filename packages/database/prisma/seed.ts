import { PrismaClient } from "@prisma/client";
import { DISCIPLINES } from "@academia-alexandria/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding research areas from disciplines...");

  for (const discipline of DISCIPLINES) {
    const parent = await prisma.researchArea.upsert({
      where: { slug: discipline.slug },
      update: { name: discipline.name },
      create: {
        name: discipline.name,
        slug: discipline.slug,
      },
    });

    if (discipline.children) {
      for (const child of discipline.children) {
        await prisma.researchArea.upsert({
          where: { slug: child.slug },
          update: { name: child.name, parentId: parent.id },
          create: {
            name: child.name,
            slug: child.slug,
            parentId: parent.id,
          },
        });
      }
    }
  }

  const count = await prisma.researchArea.count();
  console.log(`Seeded ${count} research areas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
