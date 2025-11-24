import React, { useRef, useEffect, useState } from 'react';
import './TreeContainer.css';

/**
 * TreeContainer - 배경 이미지 + 투명 나무 iframe 레이어링
 *
 * @param {Object} props
 * @param {string} props.type - 'init' | 'grow' (초기화 또는 성장)
 * @param {number} props.score - 새로 획득한 점수 (grow일 때 사용, 30점 단위)
 * @param {string} props.cafeId - 카페 고유 ID (uid로 사용)
 * @param {number} props.totalScore - 총 보틀 점수 (꽃/열매 보상 레벨 결정)
 * @param {number} props.totalCount - 총 적립 횟수 (나무 가지 개수 결정)
 * @param {string} props.backgroundImage - 배경 이미지 경로 (선택)
 * @param {string} props.objectImage - 오브젝트 이미지 경로 (선택)
 */
function TreeContainer({
  type = 'init',
  score = 0,
  cafeId,
  totalScore = 0,
  totalCount = 0,
  backgroundImage,
  objectImage
}) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const countRef = useRef(-1); // grow 메시지 중복 실행 방지용

  // 환경변수에서 Tree URL 가져오기 + noBackground 파라미터 추가
  const treeUrl = import.meta.env.VITE_TREE_URL || 'https://bottleclub-tree.web.app/';
  const treeUrlWithParams = `${treeUrl}?noBackground=true`;

  // Debug: Log when background props change
  useEffect(() => {
    console.log('🖼️ TreeContainer received new props:', { backgroundImage, objectImage });
  }, [backgroundImage, objectImage]);


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

    const iframe = document.querySelector('.tree-iframe');
    if (!iframe?.contentWindow) return;

    try {
      // 1. 항상 count=1로 초기화
      const initMessage = {
        type: 'init',
        uid: cafeId,
        total: 0,
        count: 1,
        score: 0,
        force: true
      };

      iframe.contentWindow.postMessage(JSON.stringify(initMessage), '*');
      console.log('🌱 TreeContainer: init 전송 완료 (count=1)', initMessage);

      // 2. totalCount > 1이면 grow 메시지를 (totalCount - 1)번 반복 전송
      if (totalCount > 1) {
        setTimeout(() => {
          for (let i = 1; i < totalCount; i++) {
            const growMessage = {
              type: 'grow',
              uid: cafeId,
              total: 30 * (i + 1), // 누적 점수 (30점씩 증가)
              count: i + 1,         // 누적 횟수
              score: 30,
              force: true
            };

            // 각 grow 메시지를 100ms 간격으로 전송
            setTimeout(() => {
              iframe.contentWindow.postMessage(JSON.stringify(growMessage), '*');
              // console.log(`🌿 TreeContainer: grow ${i} 전송 완료`, { count: i + 1, total: 30 * (i + 1) });
              console.log(`🌿 TreeContainer: grow ${i} 전송 완료`, { count: i + 1, total: totalScore });
            }, i * 100);
          }
        }, 100); // init 후 100ms 대기
      }
    } catch (error) {
      console.error('TreeContainer: 메시지 전송 실패', error);
    }
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
      count: 1,
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
      {/* 배경 레이어 1: 메인 배경 이미지 */}
      <div
        className="tree-background"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* 배경 레이어 2: 오브젝트 이미지 (선택) */}
      {objectImage && (
        <div
          className="tree-objects"
          style={{ backgroundImage: `url(${objectImage})` }}
        />
      )}

      {/* 전경: 투명 배경의 나무 iframe */}
      <iframe
        ref={iframeRef}
        src={treeUrlWithParams}
        title="보틀 나무"
        className="tree-iframe"
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; storage-access"
      />
    </div>
  );
}

export default TreeContainer;
