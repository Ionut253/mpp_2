const { execSync } = require('child_process');

console.log('🚀 Starting deployment process...');

try {
    // Run database migrations
    console.log('📦 Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Build the application
    console.log('🏗️ Building the application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Start the application
    console.log('🌟 Starting the application...');
    execSync('npm run start', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
} 