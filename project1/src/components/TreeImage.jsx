// src/components/TreeImage.js

import React from 'react';
// import { ReactComponent as TreeStage1 } from '../assets/images/tree_stage1.svg';
// ... 실제 이미지 파일을 import 해야 합니다.
import './TreeImage.css';

// 누적 횟수에 따라 이미지 단계를 결정하는 함수
const getTreeStage = (total) => {
  if (total >= 31) {
    return 3; // 31회 이상: 3단계
  } else if (total >= 11) {
    return 2; // 11 ~ 30회: 2단계
  } else {
    return 1; // 0 ~ 10회: 1단계
  }
};

function TreeImage({ totalAccumulated }) {
  const stage = getTreeStage(totalAccumulated);
  const imagePath = `/images/tree_stage${stage}.png`; // 이미지 경로 설정

  return (
    <div className="tree-wrapper">
      <img
        src={imagePath}
        alt={`성장 ${stage}단계 나무`}
        className="tree-image"
      />
      <p className="stage-info">현재 나무 성장 단계: {stage}단계 ({totalAccumulated}회)</p>
    </div>
  );
}

export default TreeImage;