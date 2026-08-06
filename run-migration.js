const { execSync } = require('child_process');

try {
  console.log('Running: npx prisma db push --accept-data-loss');
  const output = execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    windowsHide: true,
  });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
