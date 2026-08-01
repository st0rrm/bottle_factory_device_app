require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');
const { runAutoMigration } = require('./scripts/autoMigrate');
const {
  startBizMNotificationScheduler,
  stopBizMNotificationScheduler,
} = require('./src/schedulers/bizmNotificationScheduler');
const { startScheduler: startQRRentalsSync } = require('./src/schedulers/syncQRRentals');
const { startScheduler: startQRCollectionsSync } = require('./src/schedulers/syncQRCollections');

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, async () => {
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
  console.log('\n📱 BizM 알림톡: Render 서버에서 처리 (대여 완료 즉시, 매일 12:00 KST)');
  console.log('\n🔥 Firebase → PostgreSQL 실시간 동기화:');
  console.log('   - QR 대여 (rents)');
  console.log('   - QR 적립 (collect_history)');
  console.log('='.repeat(50));

  // 자동 마이그레이션 실행
  await runAutoMigration();

  // BizM 알림톡 정오 리마인더 시작
  startBizMNotificationScheduler();

  // Firebase → PostgreSQL 실시간 동기화 시작
  startQRRentalsSync();      // QR 대여 동기화
  startQRCollectionsSync();  // QR 적립 동기화
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopBizMNotificationScheduler();
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
  stopBizMNotificationScheduler();
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
