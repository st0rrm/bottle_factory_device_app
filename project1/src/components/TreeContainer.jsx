import React, { useRef, useEffect, useState } from 'react';
import './TreeContainer.css';

/**
 * TreeContainer - bottleclub-tree 웹앱을 iframe으로 임베드하여 나무 애니메이션 표시
 *
 * @param {Object} props
 * @param {string} props.type - 'init' | 'grow' (초기화 또는 성장)
 * @param {number} props.score - 새로 획득한 점수 (grow일 때 사용)
 * @param {string} props.cafeId - 카페 고유 ID (uid로 사용)
 * @param {number} props.totalScore - 총 점수
 * @param {number} props.totalCount - 총 적립 횟수
 */
function TreeContainer({ type = 'init', score = 0, cafeId, totalScore = 0, totalCount = 0 }) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const countRef = useRef(-1); // grow 메시지 중복 실행 방지용

  // 환경변수에서 Tree URL 가져오기
  const treeUrl = import.meta.env.VITE_TREE_URL || 'https://bottleclub-tree.web.app/';

  // 디버깅용: window에 전역 함수 등록
  useEffect(() => {
    window.__sendTreeInit = (customCafeId, customTotal, customCount) => {
      const debugMessage = {
        type: 'init',
        uid: customCafeId || cafeId || 'test-cafe',
        total: customTotal !== undefined ? customTotal : totalScore,
        force: true,
        count: customCount !== undefined ? customCount : totalCount,
        score: 0
      };

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify(debugMessage), '*');
        console.log('🐛 Debug: init 메시지 전송됨', debugMessage);
        return debugMessage;
      } else {
        console.error('🐛 Debug: iframe contentWindow를 찾을 수 없음');
        return null;
      }
    };

    window.__sendTreeGrow = (customScore) => {
      const debugMessage = {
        type: 'grow',
        uid: cafeId || 'test-cafe',
        total: totalScore,
        force: true,
        count: totalCount,
        score: customScore || score || 10
      };

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify(debugMessage), '*');
        console.log('🐛 Debug: grow 메시지 전송됨', debugMessage);
        return debugMessage;
      } else {
        console.error('🐛 Debug: iframe contentWindow를 찾을 수 없음');
        return null;
      }
    };

    console.log('🐛 디버깅 함수 등록됨: window.__sendTreeInit(cafeId, total, count), window.__sendTreeGrow(score)');

    return () => {
      delete window.__sendTreeInit;
      delete window.__sendTreeGrow;
    };
  }, [cafeId, totalScore, totalCount, score]);

  // iframe 로드 후 3초 뒤 자동으로 ready 상태로 전환
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let timeoutId;

    const handleLoad = () => {
      console.log('TreeContainer: 📦 iframe 로드 완료');

      // bottleclub-tree 초기화를 위해 충분한 시간(3초) 대기 후 ready 상태로 전환
      // 이 시간 동안 Three.js, 텍스처 등이 로드됨
      timeoutId = setTimeout(() => {
        console.log('TreeContainer: ✅ 나무 준비 완료');
        setIsReady(true);
      }, 3000);
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 초기화: isReady가 true가 되면 init 메시지 전송
  useEffect(() => {
    console.log('TreeContainer: useEffect 트리거됨', { isReady, cafeId, type, totalScore, totalCount });

    if (!isReady || !cafeId || type !== 'init') {
      console.log('TreeContainer: ❌ 조건 미충족', { isReady, cafeId, type });
      return;
    }

    // 콘솔 테스트와 동일한 순서로 메시지 구성
    const message = {
      type: 'init',
      uid: cafeId,
      total: totalScore,
      count: totalCount+1,
      score: 0,
      force: true
    };

    console.log('TreeContainer: 📤 init 메시지 전송 시작', message);

    const timers = [];
    let resourceDetected = false;

    // init 메시지 전송 함수
    const sendMessage = () => {
      // querySelector로 직접 선택 (더 안정적)
      const iframe = document.querySelector('.tree-iframe');

      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify(message), '*');
          console.log('TreeContainer: 📨 init 전송');
        } catch (error) {
          console.error('TreeContainer: ❌ 전송 실패', error);
        }
      } else {
        console.warn('TreeContainer: ⚠️ iframe을 찾을 수 없음');
      }
    };

    // 여러 시점에 메시지 전송 시도
    // bottleclub-tree가 언제 준비될지 불확실하므로 다양한 시점에 시도
    console.log('TreeContainer: 🚀 다중 시점 init 전송 시작');

    const sendTimes = [0, 1000, 2000]; // 0초, 1초, 2초, 3초, 5초, 7초, 10초

    sendTimes.forEach(delay => {
      timers.push(setTimeout(() => {
        sendMessage();
        console.log(`TreeContainer: 📨 ${delay}ms 시점 전송`);
      }, delay));
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isReady, cafeId, type, totalScore, totalCount]);

  // 성장: type이 'grow'일 때 grow 메시지 전송
  useEffect(() => {
    if (!isReady || !cafeId || type !== 'grow' || score <= 0) return;

    // 중복 실행 방지
    if (countRef.current === totalCount) return;
    countRef.current = totalCount;

    const message = {
      type: 'grow',
      uid: cafeId,
      total: totalScore,
      force: true,
      count: totalCount,
      score: score
    };

    console.log('TreeContainer: 📤 grow 메시지 전송', message);

    // querySelector로 직접 선택 (더 안정적)
    const iframe = document.querySelector('.tree-iframe');

    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify(message), '*');
      } catch (error) {
        console.error('TreeContainer: ❌ grow 전송 실패', error);
      }
    } else {
      console.warn('TreeContainer: ⚠️ iframe을 찾을 수 없음 (grow)');
    }
  }, [isReady, cafeId, type, score, totalScore, totalCount]);

  return (
    <div className="tree-container">
      <iframe
        ref={iframeRef}
        src={treeUrl}
        title="보틀 나무"
        className="tree-iframe"
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; storage-access"
      />
    </div>
  );
}

export default TreeContainer;
