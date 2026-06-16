const { execSync } = require('child_process');

function log(message) {
  console.log(`[Migration] ${new Date().toISOString()} ${message}`);
}

function logError(message) {
  console.error(`[Migration] ${new Date().toISOString()} ${message}`);
}

log('Starting database migration...');

try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  log('Database migration completed successfully');
} catch (error) {
  logError('Database migration failed');
  if (error instanceof Error && error.message) {
    logError(error.message);
  }
  process.exit(1);
}
