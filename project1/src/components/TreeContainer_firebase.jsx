import React, { useRef, useEffect, useState } from 'react';
import './TreeContainer.css';

/**
 * TreeContainer - 배경 이미지 + 투명 나무 iframe 레이어링
 *
 * @param {Object} props
 * @param {string} props.type - 'init' | 'grow' (초기화 또는 성장)
 * @param {number} props.score - 새로 획득한 점수 (grow일 때 사용, 10점 단위)
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
  const [isTreeInitialized, setIsTreeInitialized] = useState(false); // 나무 초기화 여부
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

  // 초기화: isReady가 true가 되면 load 시도, 실패하면 init
  useEffect(() => {
    if (!isReady || !cafeId || isTreeInitialized) {
      return;
    }

    const iframe = document.querySelector('.tree-iframe');
    if (!iframe?.contentWindow) return;

    // 1. 먼저 저장된 나무 불러오기 시도
    try {
      const loadMessage = {
        type: 'load',
        uid: cafeId
      };
      iframe.contentWindow.postMessage(JSON.stringify(loadMessage), '*');
      console.log('🌳 TreeContainer: load 시도', cafeId);

      // load 성공 여부와 관계없이 500ms 후 init 시도 (bottler_tree_app에서 저장된 데이터 없으면 자동으로 init)
      setTimeout(() => {
        if (!isTreeInitialized) {
          const initMessage = {
            type: 'init',
            uid: cafeId,
            total: totalScore,
            count: totalCount,
            score: 0,
            force: false  // force=false: 저장된 데이터가 있으면 사용, 없으면 새로 생성
          };
          iframe.contentWindow.postMessage(JSON.stringify(initMessage), '*');
          console.log('🌱 TreeContainer: init 완료', { cafeId, totalScore, totalCount });
          setIsTreeInitialized(true);
        }
      }, 500);
    } catch (error) {
      console.error('TreeContainer: 초기화 실패', error);
    }
  }, [isReady, cafeId, totalScore, totalCount, isTreeInitialized]);

  // 성장: type이 'grow'일 때 grow + save 메시지 전송
  useEffect(() => {
    if (!isReady || !cafeId || !isTreeInitialized || type !== 'grow' || score <= 0) return;

    // 중복 실행 방지
    if (countRef.current === totalCount) return;
    countRef.current = totalCount;

    const iframe = document.querySelector('.tree-iframe');
    if (!iframe?.contentWindow) return;

    try {
      // 1. 나무 성장
      const growMessage = {
        type: 'grow',
        uid: cafeId,
        total: totalScore,
        count: totalCount,
        score: score
      };
      iframe.contentWindow.postMessage(JSON.stringify(growMessage), '*');
      console.log('🌿 TreeContainer: grow 완료', { score, totalScore, totalCount });

      // 2. 성장 후 자동으로 저장 (500ms 후)
      setTimeout(() => {
        const saveMessage = {
          type: 'save',
          uid: cafeId
        };
        iframe.contentWindow.postMessage(JSON.stringify(saveMessage), '*');
        console.log('💾 TreeContainer: save 완료', cafeId);
      }, 500);
    } catch (error) {
      console.error('TreeContainer: grow/save 실패', error);
    }
  }, [isReady, cafeId, isTreeInitialized, type, score, totalScore, totalCount]);

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
