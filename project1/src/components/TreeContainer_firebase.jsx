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
 * @param {boolean} props.forceRegen - true가 되면 iframe 리로드 후 force=true로 나무 재생성
 */
function TreeContainer({
  type = 'init',
  score = 0,
  cafeId,
  totalScore = 0,
  totalCount = 0,
  backgroundImage,
  objectImage,
  forceRegen = false
}) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isTreeInitialized, setIsTreeInitialized] = useState(false); // 나무 초기화 여부
  const countRef = useRef(-1); // grow 메시지 중복 실행 방지용
  const forceInitRef = useRef(false); // 재생성 시 다음 init에서 force=true 사용하도록 플래그 보관

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

  // 나무 재생성: iframe 리로드로 Three.js 상태(poolCount 등)를 완전히 초기화한 뒤
  // force=true init으로 동일 레벨의 새 배치를 생성
  // (postMessage init만으로는 기존 instancedMesh pool이 누적되어 나무가 커지는 문제 발생)
  useEffect(() => {
    if (!forceRegen) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    // 다음 init useEffect 실행 시 force=true를 쓰도록 플래그 설정
    forceInitRef.current = true;

    // 상태 리셋 → 기존 handleLoad 리스너가 새 load 이벤트를 받아 isReady=true로 재전환
    setIsReady(false);
    setIsTreeInitialized(false);
    countRef.current = -1;

    const src = iframe.src;
    iframe.src = '';
    setTimeout(() => { iframe.src = src; }, 100);
    console.log('🔄 TreeContainer: 나무 재생성 - iframe 리로드 시작');
  }, [forceRegen]);

  // 초기화: isReady가 true가 되면 load 시도, 실패하면 init
  useEffect(() => {
    if (!isReady || !cafeId || isTreeInitialized) {
      return;
    }

    const iframe = document.querySelector('.tree-iframe');
    if (!iframe?.contentWindow) return;

    const isForceRegen = forceInitRef.current;

    try {
      if (!isForceRegen) {
        // 일반 초기화: IndexedDB에 저장된 나무 불러오기 시도
        iframe.contentWindow.postMessage(JSON.stringify({ type: 'load', uid: cafeId }), '*');
        console.log('🌳 TreeContainer: load 시도', cafeId);
      }

      // 500ms 후 init 전송
      // - 일반(force=false): IndexedDB 데이터 있으면 유지, 없으면 새로 생성
      // - 재생성(force=true): IndexedDB 무시, 동일 레벨(total/count)로 새 배치 생성
      setTimeout(() => {
        if (isTreeInitialized) return; // 중복 방지

        iframe.contentWindow.postMessage(JSON.stringify({
          type: 'init',
          uid: cafeId,
          total: totalScore,
          count: totalCount,
          force: isForceRegen
        }), '*');
        console.log(
          isForceRegen ? '🔄 TreeContainer: 재생성 init (force=true)' : '🌱 TreeContainer: init (force=false)',
          { cafeId, totalScore, totalCount }
        );

        if (isForceRegen) {
          // 재생성 완료 후 IndexedDB에 새 나무 저장 (이후 새로고침 시 새 나무 유지)
          setTimeout(() => {
            iframe.contentWindow.postMessage(JSON.stringify({ type: 'save', uid: cafeId }), '*');
            console.log('💾 TreeContainer: 재생성 save 완료', cafeId);
          }, 500);
          forceInitRef.current = false; // 플래그 리셋
        }

        setIsTreeInitialized(true);
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
    <>
      {/* 배경 레이어 1: 메인 배경 이미지 (화면 전체, z-index:1) */}
      <div
        className="tree-background"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* 배경 레이어 2: 오브젝트 이미지 (화면 전체, z-index:2) */}
      {objectImage && (
        <div
          className="tree-objects"
          style={{ backgroundImage: `url(${objectImage})` }}
        />
      )}

      {/* tree-container: iframe만 포함 (home.jsx JS로 위치 동적 조정, z-index:4) */}
      <div className="tree-container">
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
    </>
  );
}

export default TreeContainer;
