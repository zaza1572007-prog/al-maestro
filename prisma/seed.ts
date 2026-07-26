import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const hashedPassword = await bcrypt.hash('12312345', 10);

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

  console.log('✅ Master Admin User Upserted Successfully:', admin.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
