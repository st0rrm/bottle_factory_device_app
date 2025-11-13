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


  // iframe 로드 후 3초 뒤 자동으로 ready 상태로 전환
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let timeoutId;

    const handleLoad = () => {
      // bottleclub-tree 초기화를 위해 충분한 시간(3초) 대기 후 ready 상태로 전환
      // 이 시간 동안 Three.js, 텍스처 등이 로드됨
      timeoutId = setTimeout(() => {
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
    if (!isReady || !cafeId || type !== 'init') {
      return;
    }

    const message = {
      type: 'init',
      uid: cafeId,
      total: totalScore,
      count: totalCount,
      score: 0,
      force: true
    };

    const timers = [];

    // init 메시지 전송 함수
    const sendMessage = () => {
      const iframe = document.querySelector('.tree-iframe');

      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify(message), '*');
        } catch (error) {
          console.error('TreeContainer: init 전송 실패', error);
        }
      }
    };

    // 여러 시점에 메시지 전송 시도 (bottleclub-tree 준비 시간 고려)
    const sendTimes = [0, 1000, 2000];

    sendTimes.forEach(delay => {
      timers.push(setTimeout(sendMessage, delay));
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

    const iframe = document.querySelector('.tree-iframe');

    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify(message), '*');
      } catch (error) {
        console.error('TreeContainer: grow 전송 실패', error);
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
