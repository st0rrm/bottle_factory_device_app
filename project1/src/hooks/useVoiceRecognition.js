import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceActivityDetection } from './useVoiceActivityDetection';

/**
 * LLM 기반 음성 인식 훅
 * OpenAI Whisper (음성→텍스트) + Claude Haiku (의도 분석)
 *
 * 동작 방식:
 * - VAD: 음량이 일정 수준 이상일 때만 API 활성화 (비용 절감)
 * - 5초마다 API로 음성 분석
 * - 0-15초: 누적 분석 (0-5초, 0-10초, 0-15초)
 * - 15초 이후: 15초 슬라이딩 윈도우 (5-20초, 10-25초, ...)
 * - confidence 기반 적응형 녹음 (최소 5초 ~ 최대 30초)
 *
 * @param {boolean} enabled - 음성 인식 활성화 여부
 * @param {function} onTakeoutDetected - 포장 의도 감지 시 콜백 함수
 * @param {object} options - 설정 옵션
 */
export const useVoiceRecognition = (
  enabled = true,
  onTakeoutDetected = () => {},
  options = {}
) => {
  const {
    segmentDuration = 5000,         // 5초 단위 세그먼트
    lowThreshold = 0.4,             // 0.4 미만 → 폐기 및 재시작
    highThreshold = 0.7,            // 0.7 이상 → 확정
    maxCumulativeDuration = 15000,  // 15초까지 누적 모드
    windowSize = 15000,             // 슬라이딩 윈도우 크기
    maxTotalDuration = 30000,       // 최대 총 녹음 시간 (30초)
    restartDelay = 1000,
    vadThreshold = 40,              // VAD 음량 임계값 (0-255)
    vadSilenceDuration = 2000,      // VAD 침묵 판정 시간 (ms)
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [currentSegments, setCurrentSegments] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle, cumulative, sliding

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // 세그먼트별로 청크 저장: [[chunk1, chunk2], [chunk3, chunk4], ...]
  const segmentsRef = useRef([]);
  const currentSegmentChunksRef = useRef([]);

  const startTimeRef = useRef(0);
  const segmentTimeoutRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  // VAD 초기화
  const { isVoiceDetected, currentVolume, startDetection, stopDetection } =
    useVoiceActivityDetection({
      threshold: vadThreshold,
      silenceDuration: vadSilenceDuration,
      onVoiceStart: () => {
        console.log('🎤 VAD: 음성 감지 → API 활성화');
        startContinuousRecording();
      },
      onVoiceEnd: () => {
        console.log('⏸️ VAD: 침묵 감지 → API 비활성화');
        stopRecording();
      },
    });

  // 마이크 권한 요청
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('마이크 권한 거부:', err);
      setError('마이크 접근 권한이 필요합니다.');
      setHasPermission(false);
      return false;
    }
  }, []);

  // 연속 녹음 시작
  const startContinuousRecording = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      segmentsRef.current = [];
      currentSegmentChunksRef.current = [];
      startTimeRef.current = Date.now();

      // 100ms마다 청크 수집 (분석 중에도 연속 녹음)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentSegmentChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsListening(true);
      setPhase('cumulative');
      setError(null);

      console.log('🎤 음성 인식 시작');

      // 첫 번째 세그먼트 분석 예약
      scheduleNextSegment();

    } catch (err) {
      console.error('녹음 시작 실패:', err);
      setError('녹음을 시작할 수 없습니다.');
      setIsListening(false);
    }
  }, [hasPermission, requestPermission]);

  // 다음 세그먼트 처리 예약
  const scheduleNextSegment = useCallback(() => {
    segmentTimeoutRef.current = setTimeout(() => {
      saveCurrentSegment();
      analyzeSegments();
    }, segmentDuration);
  }, [segmentDuration]);

  // 현재 세그먼트 저장
  const saveCurrentSegment = useCallback(() => {
    if (currentSegmentChunksRef.current.length > 0) {
      segmentsRef.current.push([...currentSegmentChunksRef.current]);
      currentSegmentChunksRef.current = [];

      const totalSegments = segmentsRef.current.length;
      setCurrentSegments(totalSegments);

      console.log(`💾 세그먼트 ${totalSegments} 저장`);
    }
  }, []);

  // 세그먼트 분석
  const analyzeSegments = useCallback(async () => {
    if (isAnalyzingRef.current) {
      console.log('⚠️ 이미 분석 중, 건너뛰기');
      return;
    }

    isAnalyzingRef.current = true;
    const totalSegments = segmentsRef.current.length;
    const totalDuration = totalSegments * segmentDuration;

    console.log(`\n📊 분석 시작 (${totalDuration}ms)`);

    try {
      // 분석할 세그먼트 선택
      let segmentsToAnalyze;
      let analysisMode;

      if (totalDuration <= maxCumulativeDuration) {
        // 0-15초: 누적 분석
        segmentsToAnalyze = segmentsRef.current;
        analysisMode = 'cumulative';
        setPhase('cumulative');
        console.log(`📈 누적: 0-${totalDuration}ms`);
      } else {
        // 15초 이후: 슬라이딩 윈도우
        const windowSegments = Math.floor(windowSize / segmentDuration);
        segmentsToAnalyze = segmentsRef.current.slice(-windowSegments);
        analysisMode = 'sliding';
        setPhase('sliding');

        const startIdx = segmentsRef.current.length - windowSegments;
        const startTime = startIdx * segmentDuration;
        const endTime = startTime + windowSize;
        console.log(`🔄 슬라이딩: ${startTime}-${endTime}ms`);
      }

      // 청크 병합
      const allChunks = segmentsToAnalyze.flat();
      const audioBlob = new Blob(allChunks, { type: 'audio/webm' });

      console.log(`📦 ${(audioBlob.size / 1024).toFixed(2)}KB`);

      const analysisStartTime = Date.now();
      const result = await analyzeVoice(audioBlob);
      const analysisTime = Date.now() - analysisStartTime;

      console.log(`✅ 응답: ${analysisTime}ms, confidence: ${result.confidence}, text: "${result.text || 'N/A'}"`);

      // 결과 처리
      if (result.confidence >= highThreshold && result.takeout) {
        // 확정
        console.log(`✅ 포장 감지 (confidence ${result.confidence})`);
        stopRecording();
        onTakeoutDetected(0);

      } else if (result.confidence >= lowThreshold && result.confidence < highThreshold && result.takeout) {
        // 추가 녹음
        if (totalDuration >= maxTotalDuration) {
          console.log(`⏱️ 최대 시간 도달`);
          stopRecording();
          restartRecording();
        } else {
          console.log(`⏳ 추가 녹음 (confidence ${result.confidence})`);
          scheduleNextSegment();
        }

      } else {
        // 재시작
        console.log(`❌ 재시작 (confidence ${result.confidence})`);
        stopRecording();
        restartRecording();
      }

    } catch (error) {
      console.error('❌ 분석 실패:', error);
      setError('음성 분석에 실패했습니다.');
      stopRecording();
      restartRecording();
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [segmentDuration, maxCumulativeDuration, windowSize, maxTotalDuration, lowThreshold, highThreshold, onTakeoutDetected]);

  // API 호출
  const analyzeVoice = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch('/api/voice/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('음성 분석 API 호출 실패');
    }

    return response.json();
  };

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (segmentTimeoutRef.current) {
      clearTimeout(segmentTimeoutRef.current);
      segmentTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setPhase('idle');
    setCurrentSegments(0);
    segmentsRef.current = [];
    currentSegmentChunksRef.current = [];
    isAnalyzingRef.current = false;

    console.log('⏹️ 중지\n');
  }, []);

  // 재시작
  const restartRecording = useCallback(() => {
    setTimeout(() => {
      if (enabled) {
        console.log(`🔄 재시작\n`);
        startContinuousRecording();
      }
    }, restartDelay);
  }, [enabled, restartDelay, startContinuousRecording]);

  // VAD 자동 시작 (enabled=true일 때)
  useEffect(() => {
    if (!enabled || !hasPermission) return;

    let stream = null;

    const startVAD = async () => {
      try {
        // 마이크 스트림 획득
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        // VAD 시작 (음량 감지만 수행, API 호출 X)
        console.log('🎧 VAD 활성화 (음성 감지 대기 중...)');
        startDetection(stream);

      } catch (err) {
        console.error('마이크 접근 실패:', err);
        setError('마이크 접근 권한이 필요합니다.');
      }
    };

    startVAD();

    return () => {
      if (segmentTimeoutRef.current) {
        clearTimeout(segmentTimeoutRef.current);
      }
      stopDetection();
      stopRecording();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, hasPermission]);

  return {
    isListening,
    hasPermission,
    requestPermission,
    error,
    currentSegments,
    phase,
    isVoiceDetected,  // VAD 음성 감지 여부
    currentVolume,    // VAD 현재 음량
    stopRecording,
  };
};
