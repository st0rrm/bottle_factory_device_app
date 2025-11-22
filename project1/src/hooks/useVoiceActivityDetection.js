import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 음성 활동 감지 (VAD - Voice Activity Detection)
 * 브라우저 내장 Web Audio API 사용 (외부 라이브러리 없음)
 *
 * 동작:
 * - 마이크 입력의 평균 음량을 실시간 측정
 * - threshold 이상이면 음성 시작으로 간주
 * - silenceDuration 동안 threshold 미만이면 음성 종료로 간주
 *
 * @param {object} options - 설정 옵션
 * @param {number} options.threshold - 음량 임계값 (0-255, 기본 40)
 * @param {number} options.silenceDuration - 침묵 판정 시간 (ms, 기본 2000)
 * @param {function} options.onVoiceStart - 음성 시작 시 콜백
 * @param {function} options.onVoiceEnd - 음성 종료 시 콜백
 */
export const useVoiceActivityDetection = (options = {}) => {
  const {
    threshold = 40,
    silenceDuration = 2000,
    onVoiceStart = () => {},
    onVoiceEnd = () => {},
  } = options;

  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const isVoiceDetectedRef = useRef(false);

  // 음량 감지 시작
  const startDetection = useCallback(async (stream) => {
    try {
      // AudioContext 생성 (브라우저 내장)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Analyser 노드 생성 (주파수/음량 분석용)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // 분석 해상도 (256 bins)
      analyser.smoothingTimeConstant = 0.8; // 평활화 (노이즈 감소)
      analyserRef.current = analyser;

      // 마이크 스트림을 AudioContext에 연결
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      // 음량 데이터를 저장할 배열
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      console.log('🎧 VAD 시작 (threshold:', threshold, ')');

      // 음량 체크 함수 (60fps로 실행)
      const checkVolume = () => {
        // 주파수 데이터를 가져옴 (0-255 범위)
        analyser.getByteFrequencyData(dataArray);

        // 평균 음량 계산
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        // 상태 업데이트 (디버깅/UI용)
        setCurrentVolume(Math.round(average));

        // 음성 감지 로직
        if (average > threshold) {
          // 음량이 임계값 초과 → 음성 시작
          if (!isVoiceDetectedRef.current) {
            console.log(`✅ 음성 시작 감지 (음량: ${average.toFixed(1)})`);
            isVoiceDetectedRef.current = true;
            setIsVoiceDetected(true);
            onVoiceStart();
          }

          // 침묵 타이머 초기화 (계속 말하고 있음)
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // silenceDuration 동안 threshold 미만이면 음성 종료
          silenceTimeoutRef.current = setTimeout(() => {
            if (isVoiceDetectedRef.current) {
              console.log(`⏸️ 음성 종료 (${silenceDuration}ms 침묵)`);
              isVoiceDetectedRef.current = false;
              setIsVoiceDetected(false);
              onVoiceEnd();
            }
          }, silenceDuration);
        }

        // 다음 프레임에서 다시 체크
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      // 첫 체크 시작
      checkVolume();

    } catch (error) {
      console.error('❌ VAD 시작 실패:', error);
    }
  }, [threshold, silenceDuration, onVoiceStart, onVoiceEnd]);

  // 음량 감지 중지
  const stopDetection = useCallback(() => {
    console.log('🛑 VAD 중지');

    // 애니메이션 프레임 취소
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 침묵 타이머 취소
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // AudioContext 종료
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // 상태 초기화
    isVoiceDetectedRef.current = false;
    setIsVoiceDetected(false);
    setCurrentVolume(0);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isVoiceDetected,    // 현재 음성 감지 여부
    currentVolume,      // 현재 음량 (0-255)
    startDetection,     // 감지 시작 함수
    stopDetection,      // 감지 중지 함수
  };
};
