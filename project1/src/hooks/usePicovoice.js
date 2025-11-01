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
