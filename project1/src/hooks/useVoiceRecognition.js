import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceActivityDetection } from './useVoiceActivityDetection';

/**
 * LLM 기반 음성 인식 훅
 * OpenAI Whisper (음성→텍스트) + Claude Haiku (의도 분석)
 *
 * 동작 방식:
 * 1. 5초 세그먼트 지속 녹음
 * 2. 각 세그먼트를 VAD로 음량 분석
 * 3. 음량 낮음 → 폐기, 다음 세그먼트로
 * 4. 음량 충분 → LLM API 전송 (최대 15초 누적 + 15초 슬라이딩 윈도우)
 * 5. Confidence 기반 적응형 처리
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
    vadThreshold = 40,              // VAD 음량 임계값 (0-255)
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [currentSegments, setCurrentSegments] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle, recording, analyzing

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // 녹음된 세그먼트들 저장 (Blob 배열)
  const segmentsRef = useRef([]); // [blob1, blob2, blob3, ...]
  const currentSegmentChunksRef = useRef([]);

  const segmentIntervalRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  // VAD Hook (오디오 blob 분석용)
  const { currentVolume, analyzeSegment } = useVoiceActivityDetection({
    threshold: vadThreshold,
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
  const startRecording = useCallback(async () => {
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

      // 데이터 수집 (100ms 간격)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentSegmentChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsListening(true);
      setPhase('recording');
      setError(null);

      console.log('🎤 녹음 시작');

      // 5초마다 세그먼트 처리
      scheduleSegmentProcessing();

    } catch (err) {
      console.error('녹음 시작 실패:', err);
      setError('녹음을 시작할 수 없습니다.');
      setIsListening(false);
    }
  }, [hasPermission, requestPermission]);

  // 5초마다 세그먼트 처리
  const scheduleSegmentProcessing = useCallback(() => {
    segmentIntervalRef.current = setInterval(() => {
      processCurrentSegment();
    }, segmentDuration);
  }, [segmentDuration]);

  // 현재 세그먼트 처리
  const processCurrentSegment = useCallback(async () => {
    if (currentSegmentChunksRef.current.length === 0) {
      console.log('⚠️ 녹음 청크 없음, 건너뛰기');
      return;
    }

    // 세그먼트 Blob 생성
    const segmentBlob = new Blob(currentSegmentChunksRef.current, { type: 'audio/webm' });
    currentSegmentChunksRef.current = [];

    const segmentIndex = segmentsRef.current.length + 1;
    console.log(`\n💾 세그먼트 ${segmentIndex} 생성 (${(segmentBlob.size / 1024).toFixed(2)}KB)`);

    // VAD 분석
    const { averageVolume, shouldStartRecognition } = await analyzeSegment(segmentBlob);

    if (!shouldStartRecognition) {
      // 음량 낮음 → 폐기하고 다음 세그먼트로
      console.log(`🗑️ 세그먼트 ${segmentIndex} 폐기 (음량 ${averageVolume} < ${vadThreshold})\n`);
      // 세그먼트는 저장하지 않음
      return;
    }

    // 음량 충분 → 세그먼트 저장 및 LLM 분석
    segmentsRef.current.push(segmentBlob);
    const totalSegments = segmentsRef.current.length;
    setCurrentSegments(totalSegments);

    console.log(`✅ 세그먼트 ${segmentIndex} 저장 (총 ${totalSegments}개)`);

    // LLM 분석 시작
    analyzeLLM();
  }, [analyzeSegment, vadThreshold]);

  // LLM 분석
  const analyzeLLM = useCallback(async () => {
    if (isAnalyzingRef.current) {
      console.log('⚠️ 이미 분석 중, 건너뛰기');
      return;
    }

    isAnalyzingRef.current = true;
    setPhase('analyzing');

    const totalSegments = segmentsRef.current.length;
    const totalDuration = totalSegments * segmentDuration;

    console.log(`\n📊 LLM 분석 시작 (세그먼트 ${totalSegments}개, ${totalDuration}ms)`);

    try {
      // 분석할 세그먼트 선택
      let blobsToAnalyze;
      let analysisMode;

      if (totalDuration <= maxCumulativeDuration) {
        // 0-15초: 누적 분석
        blobsToAnalyze = segmentsRef.current;
        analysisMode = 'cumulative';
        console.log(`📈 누적 모드: 0-${totalDuration}ms (${blobsToAnalyze.length}개 세그먼트)`);
      } else {
        // 15초 이후: 슬라이딩 윈도우
        const windowSegments = Math.floor(windowSize / segmentDuration);
        blobsToAnalyze = segmentsRef.current.slice(-windowSegments);
        analysisMode = 'sliding';

        const startIdx = segmentsRef.current.length - windowSegments;
        const startTime = startIdx * segmentDuration;
        const endTime = startTime + windowSize;
        console.log(`🔄 슬라이딩 모드: ${startTime}-${endTime}ms (${blobsToAnalyze.length}개 세그먼트)`);
      }

      // 세그먼트들을 하나의 Blob으로 병합
      const mergedBlob = new Blob(blobsToAnalyze, { type: 'audio/webm' });

      console.log(`📦 병합된 오디오: ${(mergedBlob.size / 1024).toFixed(2)}KB`);

      const analysisStartTime = Date.now();
      const result = await analyzeVoice(mergedBlob);
      const analysisTime = Date.now() - analysisStartTime;

      console.log(`✅ API 응답 (${analysisTime}ms):`);
      console.log(`   텍스트: "${result.text || 'N/A'}"`);
      console.log(`   포장: ${result.takeout}, 확신도: ${result.confidence}`);
      console.log(`   이유: ${result.reason}`);

      // 결과 처리
      if (result.confidence >= highThreshold && result.takeout) {
        // 확정 → 포장 감지
        console.log(`\n🎉 포장 의도 확정 (confidence ${result.confidence})`);
        stopRecording();
        onTakeoutDetected(0);

      } else if (result.confidence >= lowThreshold && result.confidence < highThreshold && result.takeout) {
        // 애매함 → 추가 녹음
        if (totalDuration >= maxTotalDuration) {
          console.log(`\n⏱️ 최대 시간 도달 (${totalDuration}ms), 재시작`);
          stopRecording();
          setTimeout(() => startRecording(), 1000);
        } else {
          console.log(`\n⏳ 추가 녹음 진행 (confidence ${result.confidence})`);
          setPhase('recording');
          // 계속 녹음 (interval이 자동으로 다음 세그먼트 처리)
        }

      } else {
        // 포장 아님 or 확신도 낮음 → 폐기 및 재시작
        console.log(`\n❌ 포장 의도 없음 또는 낮은 확신도 (confidence ${result.confidence}), 재시작`);
        stopRecording();
        setTimeout(() => startRecording(), 1000);
      }

    } catch (error) {
      console.error('\n❌ LLM 분석 실패:', error);
      setError('음성 분석에 실패했습니다.');
      stopRecording();
      setTimeout(() => startRecording(), 1000);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [segmentDuration, maxCumulativeDuration, windowSize, maxTotalDuration, lowThreshold, highThreshold, onTakeoutDetected]);

  // API 호출
  const analyzeVoice = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiBaseUrl}/voice/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    return response.json();
  };

  // 녹음 중지
  const stopRecording = useCallback(() => {
    console.log('⏹️ 녹음 중지\n');

    if (segmentIntervalRef.current) {
      clearInterval(segmentIntervalRef.current);
      segmentIntervalRef.current = null;
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
  }, []);

  // enabled=true일 때 자동 시작
  useEffect(() => {
    if (!enabled || !hasPermission) return;

    console.log('🎧 음성 인식 활성화');
    startRecording();

    return () => {
      stopRecording();
    };
  }, [enabled, hasPermission]);

  return {
    isListening,
    hasPermission,
    requestPermission,
    error,
    currentSegments,
    phase,
    currentVolume,    // VAD 현재 음량
    stopRecording,
  };
};
