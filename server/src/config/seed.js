const pool = require('./database');
const bcrypt = require('bcryptjs');

// 초기 데모 데이터 생성
async function seedDemoData() {
  try {
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
      {
        cafeId: 'demo-cafe4',
        password: 'demo1234',
        cafeName: '이디야커피 신촌점',
      },
      {
        cafeId: 'demo-cafe5',
        password: 'demo1234',
        cafeName: '할리스커피 압구정점',
      },
    ];

    // 관리자 ID 가져오기
    const adminResult = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      ['admin']
    );

    if (adminResult.rows.length === 0) {
      console.error('관리자를 찾을 수 없습니다.');
      return;
    }

    const adminId = adminResult.rows[0].id;

    // 각 카페 추가
    for (const cafe of demoCafes) {
      try {
        // 이미 존재하는지 확인
        const existingCafe = await pool.query(
          'SELECT * FROM cafes WHERE cafe_id = $1',
          [cafe.cafeId]
        );

        if (existingCafe.rows.length > 0) {
          console.log(`카페 "${cafe.cafeName}" (${cafe.cafeId})는 이미 존재합니다.`);
          continue;
        }

        // 카페 추가
        const passwordHash = bcrypt.hashSync(cafe.password, 10);
        await pool.query(
          'INSERT INTO cafes (cafe_id, password_hash, cafe_name, created_by) VALUES ($1, $2, $3, $4)',
          [cafe.cafeId, passwordHash, cafe.cafeName, adminId]
        );

        console.log(`✓ 카페 "${cafe.cafeName}" (${cafe.cafeId}) 생성 완료`);
      } catch (err) {
        console.error(`카페 "${cafe.cafeName}" 생성 실패:`, err.message);
      }
    }

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
  } catch (err) {
    console.error('데모 데이터 생성 중 오류:', err);
  }
}

module.exports = { seedDemoData };
