import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const parent = await prisma.user.upsert({
    where: { email: 'parent@demo.com' },
    update: {},
    create: {
      email: 'parent@demo.com',
      passwordHash,
      name: 'Sarah Tan',
      role: Role.PARENT,
    },
  });

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@demo.com' },
    update: {},
    create: {
      email: 'tutor@demo.com',
      passwordHash,
      name: 'David Lim',
      role: Role.TUTOR,
    },
  });

  await prisma.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: {},
    create: {
      userId: tutor.id,
      displayName: 'David Lim — Math Specialist',
      qualifications: 'BSc Mathematics, NUS, 2020\nPGDE, NIE',
      experiences: '5 years teaching Sec 3-4 A-Math and E-Math\n2 years MOE contract teaching',
    },
  });

  const existingCase = await prisma.case.findFirst({ where: { ownerId: parent.id } });
  if (!existingCase) {
    await prisma.case.create({
      data: {
        title: 'Weekly P5 Math tuition near Bishan',
        subject: 'Math',
        level: 'P5',
        location: 'Bishan',
        budgetPerHour: 45,
        ownerId: parent.id,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo credentials:');
  console.log('  Parent: parent@demo.com / password123');
  console.log('  Tutor:  tutor@demo.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
