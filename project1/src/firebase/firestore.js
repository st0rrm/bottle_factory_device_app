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

    // 사용자 문서 생성
    await setDoc(userRef, {
      phone: user.phoneNumber,
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
 * 사용자의 대여권 목록 조회
 * @param {string} uid - 사용자 UID
 * @returns {Promise} 대여권 배열
 */
export const getUserTickets = async (uid) => {
  try {
    const tickets = [];

    // 1. 그룹 무료 대여권 확인
    const userResult = await getUserData(uid);
    if (userResult.success && userResult.data.group?.belong?.length > 0) {
      const groupId = userResult.data.group.belong[0];
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (groupDoc.exists() && groupDoc.data().freeCoupon === true) {
        tickets.push({
          id: `group_${groupId}`,
          type: 'group',
          name: `${groupDoc.data().name} 무료 대여권`,
          groupId: groupId,
          unlimited: true
        });
      }
    }

    // 2. 개인 구매 대여권 (goods_history)
    const goodsQuery = query(
      collection(db, 'goods_history'),
      where('uid', '==', uid),
      where('status', '==', 'enable')
    );
    const goodsSnapshot = await getDocs(goodsQuery);

    for (const docSnap of goodsSnapshot.docs) {
      const data = docSnap.data();

      // goods 정보 가져오기
      const goodsRef = doc(db, 'goods', data.goods_id);
      const goodsDoc = await getDoc(goodsRef);

      if (goodsDoc.exists()) {
        tickets.push({
          id: docSnap.id,
          type: 'goods',
          name: goodsDoc.data().name || '구매 대여권',
          goodsId: data.goods_id,
          expire: data.expire,
          unlimited: false
        });
      }
    }

    // 3. 프로젝트 대여권 (projects_history)
    const projectsQuery = query(
      collection(db, 'projects_history'),
      where('uid', '==', uid),
      where('status', '==', 'enable')
    );
    const projectsSnapshot = await getDocs(projectsQuery);

    for (const docSnap of projectsSnapshot.docs) {
      const data = docSnap.data();

      tickets.push({
        id: docSnap.id,
        type: 'project',
        name: '프로젝트 대여권',
        projectId: data.project_id,
        expire: data.expire,
        unlimited: false
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
 * 대여 처리
 * @param {string} uid - 사용자 UID
 * @param {object} ticket - 선택한 대여권
 * @param {string} shopId - 가게 ID (디바이스의 shopId)
 * @returns {Promise}
 */
export const processRental = async (uid, ticket, shopId) => {
  try {
    // rents 컬렉션에 기록 추가
    const rentalData = {
      uid: uid,
      rented_date: serverTimestamp(),
      rented_shop_id: shopId,
      status: 'rent',
      amount: 1,
      division: 'self' // 셀프 대여
    };

    // 대여권 타입별 처리
    if (ticket.type === 'goods' || ticket.type === 'project') {
      rentalData.balance_id = ticket.id;

      // 대여권 상태를 'used'로 변경
      const ticketRef = doc(db, `${ticket.type}s_history`, ticket.id);
      await updateDoc(ticketRef, {
        status: 'used'
      });
    } else if (ticket.type === 'group') {
      // 그룹 무료 대여권은 balance_id 없이 처리
      rentalData.group_id = ticket.groupId;
    }

    // rents 컬렉션에 추가
    const rentRef = await addDoc(collection(db, 'rents'), rentalData);

    console.log('대여 처리 완료:', rentRef.id);
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
