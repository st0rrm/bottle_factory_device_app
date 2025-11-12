import React, { useRef, useEffect, useState } from 'react';
import './TreeContainer.css';

/**
 * TreeContainer - bottleclub-tree 웹앱을 iframe으로 임베드하여 나무 애니메이션 표시
 * bottleclub 앱의 WebView 방식을 Web iframe으로 구현
 *
 * bottleclub/app/home/main/Main.tsx의 TreeContainer를 참고하여 구현
 *
 * @param {Object} props
 * @param {string} props.type - 'init' | 'grow' (초기화 또는 성장)
 * @param {number} props.score - 새로 획득한 점수 (grow일 때 사용)
 * @param {string} props.cafeId - 카페 고유 ID (uid로 사용)
 * @param {number} props.totalScore - 총 점수
 * @param {number} props.totalCount - 총 적립 횟수
 * @param {Object} props.cafeInfo - 카페 정보 (fallback 표시용)
 */
function TreeContainer({ type = 'init', score = 0, cafeId, totalScore = 0, totalCount = 0, cafeInfo = null }) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const countRef = useRef(-1); // postMessage 중복 실행 방지용

  // 환경변수에서 Tree URL 가져오기
  const treeUrl = import.meta.env.VITE_TREE_URL || 'https://bottleclub-tree.web.app/';

  // 컴포넌트 마운트 로깅
  useEffect(() => {
    console.log('TreeContainer: 컴포넌트 마운트', {
      type,
      cafeId,
      totalScore,
      totalCount,
      treeUrl
    });
  }, []);

  // iframe에서 메시지 수신 (bottleclub-tree → project1)
  useEffect(() => {
    const handleMessage = (event) => {
      // 보안: bottleclub-tree 도메인 또는 localhost에서 온 메시지만 처리
      if (!event.origin.includes('bottleclub-tree') &&
          !event.origin.includes('bottlefactory') &&
          !event.origin.includes('localhost') &&
          !event.origin.includes('firebaseapp.com') &&
          !event.origin.includes('web.app')) {
        return;
      }

      // event.data가 문자열이 아니면 무시
      if (typeof event.data !== 'string') {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        const { type, message } = data;

        if (type === 'COMMAND' && message === 'hello') {
          // 나무 웹앱이 준비됨
          setIsReady(true);
          console.log('TreeContainer: 🎉 나무가 준비되었습니다! (hello 수신)');
        }
      } catch (error) {
        // JSON 파싱 실패는 무시 (다른 postMessage일 수 있음)
      }
    };

    console.log('TreeContainer: 🎧 message 이벤트 리스너 등록');
    window.addEventListener('message', handleMessage);

    return () => {
      console.log('TreeContainer: 🔇 message 이벤트 리스너 제거');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // iframe 로드 이벤트 리스너 및 타임아웃 기반 초기화
  useEffect(() => {
    const iframe = iframeRef.current;
    let timeoutId;

    const handleLoad = () => {
      console.log('TreeContainer: 📦 iframe 로드 완료');

      // bottleclub-tree가 hello 메시지를 보내지 않으므로
      // 2초 후 강제로 ready 상태로 전환 (3초 → 2초로 단축)
      timeoutId = setTimeout(() => {
        if (!isReady) {
          console.log('TreeContainer: ⏰ 타임아웃으로 강제 ready 전환');
          setIsReady(true);
        }
      }, 2000);
    };

    const handleError = (error) => {
      console.error('TreeContainer: ❌ iframe 로드 실패', error);
      console.log('TreeContainer: 🔄 1초 후 재로드 시도...');

      // 에러 발생 시 iframe src를 재설정하여 다시 로드 시도
      timeoutId = setTimeout(() => {
        if (iframeRef.current && !isReady) {
          console.log('TreeContainer: 🔄 iframe 재로드 실행');
          const currentSrc = iframeRef.current.src;
          iframeRef.current.src = ''; // 초기화
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.src = currentSrc; // 재설정
            }
          }, 100);
        }
      }, 1000);
    };

    if (iframe) {
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReady]);

  // 초기화: isReady가 true가 되면 실행 (bottleclub Main.tsx:217-246 참고)
  useEffect(() => {
    if (isReady && cafeId && type === 'init') {
      const message = {
        type: 'init',
        uid: cafeId,
        total: totalScore,
        force: true, // 항상 강제 초기화 (IndexedDB 로드 실패 방지)
        count: totalCount,
        score: 0
      };

      console.log('TreeContainer: 📤 init 메시지 전송 준비', message);

      let retryCount = 0;
      const maxRetries = 3;
      const timers = [];

      const sendInitMessage = (attemptNumber) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify(message),
              '*'
            );
            console.log(`TreeContainer: ✅ init 메시지 전송 성공 (시도 ${attemptNumber}/${maxRetries})`);
            return true;
          } catch (error) {
            console.error(`TreeContainer: ❌ init 메시지 전송 실패 (시도 ${attemptNumber}/${maxRetries})`, error);
            return false;
          }
        } else {
          console.warn(`TreeContainer: ⚠️ iframe contentWindow가 아직 준비되지 않음 (시도 ${attemptNumber}/${maxRetries})`);
          return false;
        }
      };

      // 즉시 전송 (1차 시도)
      sendInitMessage(1);

      // 500ms 후 재전송 (2차 시도)
      timers.push(setTimeout(() => {
        console.log('TreeContainer: 🔄 init 메시지 2차 전송');
        sendInitMessage(2);
      }, 500));

      // 1500ms 후 재전송 (3차 시도 - 최종)
      timers.push(setTimeout(() => {
        console.log('TreeContainer: 🔄 init 메시지 3차 전송 (최종)');
        sendInitMessage(3);
      }, 1500));

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [isReady, cafeId, type, totalScore, totalCount]);

  // 성장: type이 'grow'일 때 실행 (bottleclub Main.tsx:248-275 참고)
  useEffect(() => {
    if (isReady && cafeId && type === 'grow' && score > 0) {
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

      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify(message),
          '*'
        );
      }
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
