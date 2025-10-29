const db = require('./database');
const bcrypt = require('bcryptjs');

// 초기 데모 데이터 생성
function seedDemoData() {
  console.log('데모 데이터 생성 중...');

  // 데모 카페 데이터
  const demoCafes = [
    {
      cafeId: 'demo-cafe1',
      password: 'demo1234',
      cafeName: '커피포임팩트',
    },
    {
      cafeId: 'demo-cafe2',
      password: 'demo1234',
      cafeName: '스타벅스 강남점',
    },
    {
      cafeId: 'demo-cafe3',
      password: 'demo1234',
      cafeName: '투썸플레이스 홍대점',
    },
  ];

  // 관리자 ID 가져오기
  db.get('SELECT id FROM admins WHERE username = ?', ['admin'], (err, admin) => {
    if (err || !admin) {
      console.error('관리자를 찾을 수 없습니다.');
      return;
    }

    // 각 카페 추가
    demoCafes.forEach((cafe) => {
      // 이미 존재하는지 확인
      db.get('SELECT * FROM cafes WHERE cafe_id = ?', [cafe.cafeId], (err, existingCafe) => {
        if (existingCafe) {
          console.log(`카페 "${cafe.cafeName}" (${cafe.cafeId})는 이미 존재합니다.`);
          return;
        }

        // 카페 추가
        const passwordHash = bcrypt.hashSync(cafe.password, 10);
        db.run(
          'INSERT INTO cafes (cafe_id, password_hash, cafe_name, created_by) VALUES (?, ?, ?, ?)',
          [cafe.cafeId, passwordHash, cafe.cafeName, admin.id],
          function (err) {
            if (err) {
              console.error(`카페 "${cafe.cafeName}" 생성 실패:`, err.message);
            } else {
              console.log(`✓ 카페 "${cafe.cafeName}" (${cafe.cafeId}) 생성 완료`);
            }
          }
        );
      });
    });

    console.log('\n데모 계정 정보:');
    console.log('=====================================');
    console.log('관리자:');
    console.log('  - ID: admin');
    console.log('  - PW: admin1234');
    console.log('\n카페 계정:');
    demoCafes.forEach((cafe) => {
      console.log(`  - ${cafe.cafeName}`);
      console.log(`    ID: ${cafe.cafeId}`);
      console.log(`    PW: ${cafe.password}`);
    });
    console.log('=====================================\n');
  });
}

module.exports = { seedDemoData };
