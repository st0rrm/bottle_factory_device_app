// Firestore 데이터베이스 관련 함수들
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

/**
 * 신규 사용자 자동 생성
 * @param {object} user - Firebase Auth User 객체
 * @returns {Promise}
 */
export const createNewUser = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);

    // 이미 문서가 있는지 확인
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log('사용자 문서가 이미 존재합니다.');
      return { success: true, isNew: false };
    }

    // 임의 닉네임 생성 (손님 + 랜덤 4자리)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const nickname = `손님${randomNum}`;

    // 기본 거주지 설정 (연희동)
    const defaultAddress = {
      address_name: "서울특별시 서대문구 연희동",
      address: {
        region_3depth_name: "연희동",
        region_2depth_name: "서대문구",
        region_1depth_name: "서울특별시",
        h_code: "1144010700"
      }
    };

    // 전화번호 포맷 변환 (+821012345678 → 01012345678)
    let phoneNumber = user.phoneNumber;
    if (phoneNumber.startsWith('+82')) {
      phoneNumber = '0' + phoneNumber.slice(3);
    }

    // 사용자 문서 생성
    await setDoc(userRef, {
      mobile: phoneNumber,
      name: nickname,
      score: 0,
      coin: 0,
      saving_all: 0,
      address: defaultAddress,
      adm_cd2: "1144010700",
      sido: "11",
      sgg: "11440",
      dp_nm: "연희동",
      adm_nm: "서울특별시 서대문구 연희동",
      create: serverTimestamp(),
      update: serverTimestamp()
    });

    console.log('신규 사용자 생성 완료:', user.uid, nickname);

    // ✨ 신규 사용자에게 무료 대여권 1개 자동 지급 (balances 컬렉션)
    try {
      await addDoc(collection(db, 'balances'), {
        user_id: user.uid,
        status: 'charge',  // 사용 가능 상태
        pgcode: 'bottleclub',  // 무료 대여권 식별자
        create: serverTimestamp(),
        update: serverTimestamp()
      });

      console.log('✅ 무료 대여권 1개 지급 완료 (balances 컬렉션)');
    } catch (voucherError) {
      console.error('무료 대여권 지급 실패:', voucherError);
      // 대여권 지급 실패해도 사용자 생성은 성공으로 처리
    }

    return { success: true, isNew: true, nickname };

  } catch (error) {
    console.error('사용자 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자 정보 조회
 * @param {string} uid - 사용자 UID
 * @returns {Promise}
 */
export const getUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const userData = {
      ...userDoc.data(),
      id: userDoc.id
    };

    return { success: true, data: userData };

  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 전화번호로 사용자 조회
 * @param {string} phoneNumber - 전화번호 (예: 01012345678)
 * @returns {Promise}
 */
export const getUserByPhone = async (phoneNumber) => {
  try {
    // 전화번호 포맷 통일 (010 형식 - DB 저장 형식에 맞춤)
    // +821012345678 → 01012345678
    // 01012345678 → 01012345678 (그대로 유지)
    let formattedNumber = phoneNumber;
    if (phoneNumber.startsWith('+82')) {
      formattedNumber = '0' + phoneNumber.slice(3);
    }

    console.log('전화번호로 사용자 조회:', formattedNumber);

    // users 컬렉션에서 mobile 필드로 검색
    const usersQuery = query(
      collection(db, 'users'),
      where('mobile', '==', formattedNumber)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return { success: false, error: '등록되지 않은 전화번호입니다.' };
    }

    // 첫 번째 사용자 반환 (전화번호는 unique해야 함)
    const userDoc = usersSnapshot.docs[0];
    const userData = {
      ...userDoc.data(),
      uid: userDoc.id
    };

    console.log('사용자 조회 성공:', userData.uid);
    return { success: true, user: userData };

  } catch (error) {
    console.error('전화번호로 사용자 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 대여권 목록 조회 (balances 컬렉션 기반)
 * @param {string} uid - 사용자 UID
 * @returns {Promise} 대여권 배열
 */
export const getUserTickets = async (uid) => {
  try {
    const tickets = [];

    // balances 컬렉션에서 사용 가능한 대여권 조회
    // status가 'charge'인 것만 (사용 가능)
    const balancesQuery = query(
      collection(db, 'balances'),
      where('user_id', '==', uid),
      where('status', '==', 'charge')
    );
    const balancesSnapshot = await getDocs(balancesQuery);

    for (const docSnap of balancesSnapshot.docs) {
      const data = docSnap.data();

      // 대여권 이름 결정
      let ticketName = '컵 1개 대여권';
      if (data.pgcode === 'bottleclub') {
        ticketName = '무료 대여권';
      } else if (data.group_id) {
        ticketName = data.pay_info || '그룹 대여권';
      }

      tickets.push({
        id: docSnap.id,
        type: 'balance',
        name: ticketName,
        pgcode: data.pgcode,
        group_id: data.group_id,
        status: data.status,
        create: data.create,
        update: data.update
      });
    }

    console.log('대여권 조회 완료:', tickets.length, '개');
    return { success: true, tickets };

  } catch (error) {
    console.error('대여권 조회 실패:', error);
    return { success: false, error: error.message, tickets: [] };
  }
};

/**
 * 대여 처리 (balances 기반)
 * @param {string} uid - 사용자 UID
 * @param {object} ticket - 선택한 대여권 (balances 문서)
 * @param {string} shopId - 가게 ID (디바이스의 shopId)
 * @param {string} shopName - 가게 이름
 * @returns {Promise}
 */
export const processRental = async (uid, ticket, shopId, shopName) => {
  try {
    // 1. balances 상태를 'charge' → 'rent'로 변경
    const balanceRef = doc(db, 'balances', ticket.id);
    await updateDoc(balanceRef, {
      status: 'rent',
      update: serverTimestamp()
    });

    console.log('✅ 대여권 상태 변경: charge → rent');

    // 2. rents 컬렉션에 새 문서 추가
    const rentalData = {
      uid: uid,
      rented_date: serverTimestamp(),
      rented_shop_id: shopId,
      rented_shop_name: shopName,
      status: 'rent',
      amount: 1,  // 컵 수량
      balance_id: ticket.id,  // 사용한 대여권 ID
      division: 'individual'  // 개별 반환처 (같은 가게에서 반납)
    };

    // 그룹 대여권인 경우 group_id 추가
    if (ticket.group_id) {
      rentalData.group_id = ticket.group_id;
      rentalData.division = ticket.group_id;  // 그룹 반환처
    }

    const rentRef = await addDoc(collection(db, 'rents'), rentalData);

    console.log('✅ 대여 기록 생성:', rentRef.id);
    return { success: true, rentalId: rentRef.id };

  } catch (error) {
    console.error('대여 처리 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 가게 정보 조회 (shopId로)
 * @param {string} shopId - 가게 ID
 * @returns {Promise}
 */
export const getShopData = async (shopId) => {
  try {
    const shopRef = doc(db, 'shops', shopId);
    const shopDoc = await getDoc(shopRef);

    if (!shopDoc.exists()) {
      return { success: false, error: '가게 정보를 찾을 수 없습니다.' };
    }

    const shopData = {
      ...shopDoc.data(),
      id: shopDoc.id
    };

    return { success: true, data: shopData };

  } catch (error) {
    console.error('가게 정보 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 대여 중인 컵 조회
 * @param {string} uid - 사용자 UID
 * @param {string} shopId - 가게 ID (division이 'individual'인 경우 필터링)
 * @returns {Promise} 대여 중인 컵 배열
 */
export const getUserActiveRentals = async (uid, shopId) => {
  try {
    // rents 컬렉션에서 status가 'rent'이고 uid가 일치하는 것 조회
    const rentsQuery = query(
      collection(db, 'rents'),
      where('uid', '==', uid),
      where('status', '==', 'rent')
    );
    const rentsSnapshot = await getDocs(rentsQuery);

    const rentals = [];
    for (const docSnap of rentsSnapshot.docs) {
      const data = docSnap.data();

      // division이 'individual'인 경우, 같은 가게에서 대여한 것만 반납 가능
      if (data.division === 'individual' && data.rented_shop_id !== shopId) {
        continue;  // 다른 가게에서 대여한 컵은 제외
      }

      rentals.push({
        id: docSnap.id,
        ...data
      });
    }

    console.log('대여 중인 컵 조회 완료:', rentals.length, '개');
    return { success: true, rentals };

  } catch (error) {
    console.error('대여 중인 컵 조회 실패:', error);
    return { success: false, error: error.message, rentals: [] };
  }
};

/**
 * 반납 처리
 * @param {string} uid - 사용자 UID
 * @param {object} rental - 반납할 대여 기록 (rents 문서)
 * @param {string} shopId - 가게 ID
 * @param {string} shopName - 가게 이름
 * @returns {Promise}
 */
export const processReturn = async (uid, rental, shopId, shopName) => {
  try {
    // 1. rents 문서 업데이트: status 'rent' → 'return'
    const rentRef = doc(db, 'rents', rental.id);
    await updateDoc(rentRef, {
      status: 'return',
      returned_date: serverTimestamp(),
      returned_shop_id: shopId,
      returned_shop_name: shopName
    });

    console.log('✅ 대여 기록 업데이트: rent → return');

    // 2. balances 문서 복구: status 'rent' → 'charge' (재사용 가능)
    if (rental.balance_id) {
      const balanceRef = doc(db, 'balances', rental.balance_id);
      await updateDoc(balanceRef, {
        status: 'charge',
        update: serverTimestamp()
      });

      console.log('✅ 대여권 복구: rent → charge');
    }

    // 3. 사용자 점수 적립 (보틀점수)
    const userRef = doc(db, 'users', uid);
    const returnScore = 30;  // 컵 1개당 30점 (constants에서 가져와야 함)

    await updateDoc(userRef, {
      score: (await getDoc(userRef)).data().score + returnScore,
      coin: (await getDoc(userRef)).data().coin + returnScore * 10,  // 점수 1점 = 코인 10개
      saving_all: (await getDoc(userRef)).data().saving_all + 1
    });

    console.log(`✅ 보틀점수 적립: ${returnScore}점`);

    // 4. collect_history에 적립 내역 추가
    await addDoc(collection(db, 'collect_history'), {
      score: returnScore,
      shop_id: shopId,
      uid: uid,
      create: serverTimestamp()
    });

    console.log('✅ 적립 내역 생성');

    return { success: true, score: returnScore };

  } catch (error) {
    console.error('반납 처리 실패:', error);
    return { success: false, error: error.message };
  }
};
