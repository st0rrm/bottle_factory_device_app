import React, { createContext, useContext, useState, useEffect } from 'react';

const BackgroundContext = createContext();

// Vite의 import.meta.glob을 사용하여 배경 이미지 자동 감지 (.jpg, .png 모두 지원)
const backgroundModules = import.meta.glob('../assets/images/backgrounds/bg*.{jpg,png}', { eager: true });

// 파일명 기준으로 정렬하여 배경 목록 생성
const AVAILABLE_BACKGROUNDS = Object.entries(backgroundModules)
  .map(([path, module]) => {
    const filename = path.split('/').pop(); // 'bg1.jpg', 'bg2.png' 등
    const id = filename.replace(/\.(jpg|png)$/, ''); // 'bg1', 'bg2' 등
    const number = id.replace('bg', ''); // '1', '2' 등
    return {
      id,
      name: `배경 ${number}`,
      backgroundImage: module.default,
      thumbnail: module.default,
      order: parseInt(number, 10) // 정렬용
    };
  })
  .sort((a, b) => a.order - b.order); // 번호 순으로 정렬

// 공통 오브젝트 이미지
import objectsImage from '../assets/images/backgrounds/objects/bg_objects.png';
export const OBJECTS_IMAGE = objectsImage;

export const BackgroundProvider = ({ children }) => {
  const [currentBackground, setCurrentBackground] = useState(() => {
    const saved = localStorage.getItem('tree_background_id');
    return AVAILABLE_BACKGROUNDS.find(bg => bg.id === saved) || AVAILABLE_BACKGROUNDS[0];
  });

  // bg_objects 표시 여부 상태
  const [showObjects, setShowObjects] = useState(() => {
    const saved = localStorage.getItem('tree_show_objects');
    return saved === null ? true : saved === 'true'; // 기본값: true
  });

  const changeBackground = (backgroundId) => {
    const bg = AVAILABLE_BACKGROUNDS.find(b => b.id === backgroundId);
    if (bg) {
      setCurrentBackground(bg);
      localStorage.setItem('tree_background_id', backgroundId);
      console.log('배경 변경됨:', backgroundId, bg);
    }
  };

  const toggleObjects = () => {
    const newValue = !showObjects;
    setShowObjects(newValue);
    localStorage.setItem('tree_show_objects', String(newValue));
    console.log('오브젝트 토글:', newValue);
  };

  return (
    <BackgroundContext.Provider value={{
      currentBackground,
      changeBackground,
      availableBackgrounds: AVAILABLE_BACKGROUNDS,
      showObjects,
      toggleObjects
    }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within BackgroundProvider');
  }
  return context;
};
