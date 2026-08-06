import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required to seed the initial owner account');
  }

  const hashedPassword = await bcrypt.hash(initialPassword, 10);

  // 1. Create Teacher
  const admin = await prisma.user.upsert({
    where: { phone: '0100000000' },
    update: {
      name: 'الأستاذ أحمد راضي كحلة',
      password: hashedPassword,
      role: 'OWNER',
    },
    create: {
      name: 'الأستاذ أحمد راضي كحلة',
      phone: '0100000000',
      password: hashedPassword,
      role: 'OWNER',
    },
  });

  // 2. Create System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'default-settings' },
    update: { isRegistrationOpen: true },
    create: {
      id: 'default-settings',
      platformName: 'منصة المايسترو',
      isRegistrationOpen: true,
    },
  });

  // 3. Create Real Academic Stages
  const stageList = [
    { name: 'الصف الرابع الابتدائي', level: 'Primary', grade: '4th' },
    { name: 'الصف الخامس الابتدائي', level: 'Primary', grade: '5th' },
    { name: 'الصف السادس الابتدائي', level: 'Primary', grade: '6th' },
    { name: 'الصف الأول الإعدادي', level: 'Middle', grade: '1st' },
    { name: 'الصف الثاني الإعدادي', level: 'Middle', grade: '2nd' },
    { name: 'الصف الثالث الإعدادي', level: 'Middle', grade: '3rd' },
    { name: 'الصف الأول الثانوي', level: 'High', grade: '1st' },
    { name: 'الصف الثاني الثانوي', level: 'High', grade: '2nd' },
    { name: 'الصف الثالث الثانوي', level: 'High', grade: '3rd' },
  ];

  for (const stg of stageList) {
    const createdStage = await prisma.academicStage.upsert({
      where: { name: stg.name },
      update: {},
      create: {
        name: stg.name,
        level: stg.level,
        grade: stg.grade,
      },
    });

    // Create Groups for each stage
    await prisma.group.createMany({
      data: [
        {
          name: `مجموعة ${stg.name} - (أ)`,
          academicStageId: createdStage.id,
          year: '2025/2026',
          scheduleDays: ['السبت', 'الثلاثاء'],
          startTime: '16:00',
          endTime: '18:00',
          maxCapacity: 30,
        },
        {
          name: `مجموعة ${stg.name} - (ب)`,
          academicStageId: createdStage.id,
          year: '2025/2026',
          scheduleDays: ['الأحد', 'الأربعاء'],
          startTime: '18:00',
          endTime: '20:00',
          maxCapacity: 30,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Real Database Seeded Successfully with Stages and Groups!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
