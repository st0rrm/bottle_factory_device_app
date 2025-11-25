import { useEffect, useCallback, useState } from 'react';
import { startWakeword, stopWakeword } from '../pico/picovoice';

/**
 * Custom hook for wake word detection using Picovoice
 * @param {boolean} enabled - Whether wake word detection should be active
 * @param {function} onWakeWordDetected - Callback when wake word is detected
 * @returns {Object} - { isListening, error, requestPermission }
 */
export function usePicovoice(enabled, onWakeWordDetected) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  // 초기 마이크 권한 확인 (새로고침 시에도 권한 유지)
  useEffect(() => {
    const checkExistingPermission = async () => {
      try {
        // 모바일 Safari/Chrome 호환: 실제로 마이크 스트림을 요청해서 권한 확인
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 권한이 있으면 즉시 스트림 종료
        stream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
        console.log('✅ 마이크 권한 이미 허용됨 (Picovoice, 새로고침 후 자동 확인)');
      } catch (error) {
        // 권한이 없거나 거부된 경우
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.log('⚠️ 마이크 권한 없음 (Picovoice) - 사용자가 허용 필요');
          setHasPermission(false);
        } else {
          console.log('⚠️ 마이크 권한 확인 실패 (Picovoice):', error.name);
          setHasPermission(false);
        }
      }
    };
    checkExistingPermission();
  }, []);

  // 마이크 권한 요청
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 권한을 받았으면 stream을 즉시 종료
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError('마이크 권한이 필요합니다.');
      setHasPermission(false);
      return false;
    }
  }, []);

  // Wake word detection 시작/중지
  useEffect(() => {
    if (!enabled || !hasPermission) {
      return;
    }

    let isActive = true;

    const initWakeWord = async () => {
      try {
        setError(null);

        await startWakeword((keywordIndex) => {
          if (isActive && onWakeWordDetected) {
            console.log('Wake word detected, index:', keywordIndex);
            onWakeWordDetected(keywordIndex);
          }
        });

        setIsListening(true);
      } catch (err) {
        console.error('Failed to start wake word detection:', err);
        setError(err.message || 'Wake word 감지를 시작할 수 없습니다.');
        setIsListening(false);
      }
    };

    initWakeWord();

    return () => {
      isActive = false;
      setIsListening(false);
      stopWakeword().catch(console.error);
    };
  }, [enabled, hasPermission, onWakeWordDetected]);

  return {
    isListening,
    error,
    hasPermission,
    requestPermission,
  };
}
