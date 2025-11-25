require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');
// SMS 알림은 Firebase Cloud Functions로 이관됨
// const { startSMSNotificationScheduler } = require('./src/schedulers/smsNotificationScheduler');

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`ReturnMeCup API Server`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  console.log('\nAvailable endpoints:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/admin/login`);
  console.log(`  POST http://localhost:${PORT}/api/cafe/login`);
  console.log(`  GET  http://localhost:${PORT}/api/cafe (admin only)`);
  console.log('='.repeat(50));
  console.log('\n📱 SMS 알림: Firebase Cloud Functions에서 처리 (매일 12:00 KST)');
  console.log('='.repeat(50));

  // SMS notification scheduler는 Firebase Cloud Functions로 이관됨
  // startSMSNotificationScheduler();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await db.end();
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await db.end();
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });
});
