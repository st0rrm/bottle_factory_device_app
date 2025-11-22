import { useState, useRef, useCallback } from 'react';

/**
 * 세그먼트 기반 음성 활동 감지 (VAD)
 *
 * 동작:
 * - 녹음된 오디오 blob을 받아서 음량 분석
 * - Web Audio API로 평균 음량 계산
 * - threshold 이상이면 LLM 분석 진행, 미만이면 폐기
 *
 * @param {object} options - 설정 옵션
 * @param {number} options.threshold - 음량 임계값 (0-255, 기본 40)
 */
export const useVoiceActivityDetection = (options = {}) => {
  const {
    threshold = 40,
  } = options;

  const [currentVolume, setCurrentVolume] = useState(0);

  /**
   * 오디오 blob의 평균 음량 분석
   * @param {Blob} audioBlob - 분석할 오디오 blob
   * @returns {Promise<{averageVolume: number, shouldStartRecognition: boolean}>}
   */
  const analyzeSegment = useCallback(async (audioBlob) => {
    try {
      // AudioContext 생성
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Blob을 ArrayBuffer로 변환
      const arrayBuffer = await audioBlob.arrayBuffer();

      // AudioBuffer로 디코딩
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 채널 데이터 가져오기 (모노/스테레오 모두 처리)
      const channelData = audioBuffer.getChannelData(0);

      // 평균 음량 계산 (RMS)
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      // 0-255 범위로 정규화
      const averageVolume = Math.min(255, Math.round(rms * 255 * 10));

      setCurrentVolume(averageVolume);

      console.log(`📊 세그먼트 분석: 평균 음량 ${averageVolume} (threshold: ${threshold})`);

      // AudioContext 정리
      await audioContext.close();

      const shouldStartRecognition = averageVolume >= threshold;

      if (shouldStartRecognition) {
        console.log(`✅ 음성 감지 (음량: ${averageVolume}) → LLM 분석 진행`);
      } else {
        console.log(`❌ 낮은 음량 (음량: ${averageVolume}) → 세그먼트 폐기`);
      }

      return {
        averageVolume,
        shouldStartRecognition,
      };

    } catch (error) {
      console.error('❌ VAD 분석 실패:', error);
      return {
        averageVolume: 0,
        shouldStartRecognition: false,
      };
    }
  }, [threshold]);

  return {
    currentVolume,
    analyzeSegment,  // 오디오 blob 분석 함수
  };
};
