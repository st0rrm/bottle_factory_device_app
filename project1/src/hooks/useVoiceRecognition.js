import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * LLM 기반 음성 인식 훅
 * OpenAI Whisper (음성→텍스트) + Claude Haiku (의도 분석)
 *
 * 동작 방식:
 * 1. 5초 세그먼트 지속 녹음
 * 2. 각 세그먼트를 크기 기반 휴리스틱으로 음량 추정
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
    vadThreshold = 130,              // VAD 음량 임계값 (0-255)
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
  const rmsValuesRef = useRef([]); // 각 세그먼트의 RMS 값 저장

  const segmentIntervalRef = useRef(null);
  const isAnalyzingRef = useRef(false);
  const isListeningRef = useRef(false);
  const startRecordingRef = useRef(null); // 순환 참조 방지

  // 초기 마이크 권한 확인 (새로고침 시에도 권한 유지)
  useEffect(() => {
    const checkExistingPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        if (result.state === 'granted') {
          setHasPermission(true);
        }
      } catch (error) {
        // permissions API 지원 안하는 브라우저는 무시
        console.log('Permissions API not supported');
      }
    };
    checkExistingPermission();
  }, []);

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

    // 이미 녹음 중이면 중복 시작 방지
    if (isListeningRef.current && mediaRecorderRef.current) {
      console.log('⚠️ 이미 녹음 중입니다. 중복 시작 방지.');
      return;
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
      rmsValuesRef.current = []; // RMS 값도 초기화

      // 데이터 수집: stop 시 완전한 세그먼트 수신
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentSegmentChunksRef.current.push(event.data);
        }
      };

      // stop 시 세그먼트 처리 및 즉시 재시작
      mediaRecorder.onstop = () => {
        if (currentSegmentChunksRef.current.length > 0) {
          processCurrentSegment(); // 비동기지만 기다리지 않음
        }

        // 즉시 재시작 (음성 손실 최소화: 5-10ms)
        if (isListeningRef.current && mediaRecorderRef.current) {
          currentSegmentChunksRef.current = [];
          try {
            mediaRecorderRef.current.start(); // timeslice 없음 → 완전한 WebM 생성
          } catch (error) {
            console.error('❌ 녹음 재시작 실패:', error);
          }
        }
      };

      mediaRecorder.start(); // timeslice 없이 시작
      setIsListening(true);
      isListeningRef.current = true;
      setPhase('recording');
      setError(null);

      console.log('🎤 녹음 시작 (stop/start 패턴)');

      // 5초마다 stop (완전한 세그먼트 생성)
      scheduleSegmentProcessing();

    } catch (err) {
      console.error('녹음 시작 실패:', err);
      setError('녹음을 시작할 수 없습니다.');
      setIsListening(false);
    }
  }, [hasPermission, requestPermission, scheduleSegmentProcessing]);

  // startRecording ref 업데이트 (순환 참조 방지)
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  // 5초마다 MediaRecorder stop (완전한 WebM 세그먼트 생성)
  const scheduleSegmentProcessing = useCallback(() => {
    segmentIntervalRef.current = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop(); // onstop 이벤트에서 처리 + 자동 재시작
      }
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

    // VAD 분석 (RMS 기반 실제 음압 측정)
    const averageVolume = await analyzeAudioVolumeRMS(segmentBlob);

    // RMS 분석 실패 (손상된 세그먼트) → 폐기
    if (averageVolume === null) {
      console.log(`🗑️ 세그먼트 ${segmentIndex} 폐기 (RMS 분석 실패 - 손상된 데이터)\n`);
      return;
    }

    const shouldStartRecognition = averageVolume >= vadThreshold;

    console.log(`📊 세그먼트 분석: 음량 ${averageVolume} (threshold: ${vadThreshold})`);

    if (!shouldStartRecognition) {
      // 음량 낮음 → 폐기하고 다음 세그먼트로
      console.log(`🗑️ 세그먼트 ${segmentIndex} 폐기 (음량 ${averageVolume} < ${vadThreshold})\n`);
      // 세그먼트는 저장하지 않음
      return;
    }

    console.log(`✅ 음성 감지 (음량: ${averageVolume}) → 세그먼트 저장`);

    // 음량 충분 → 세그먼트 저장 및 LLM 분석
    segmentsRef.current.push(segmentBlob);
    rmsValuesRef.current.push(averageVolume); // RMS 값 저장
    const totalSegments = segmentsRef.current.length;
    setCurrentSegments(totalSegments);

    console.log(`✅ 세그먼트 ${segmentIndex} 저장 (총 ${totalSegments}개)`);

    // LLM 분석 시작
    analyzeLLM();
  }, [vadThreshold, analyzeLLM]);

  // AudioContext 싱글톤 (재사용)
  const audioContextRef = useRef(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // RMS 기반 음량 분석 (실제 음압 측정)
  const analyzeAudioVolumeRMS = async (blob) => {
    try {
      const startTime = Date.now();

      // Blob → ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // 오디오 디코딩
      const audioContext = getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 채널 데이터 추출 (모노 또는 첫 번째 채널)
      const channelData = audioBuffer.getChannelData(0);

      // RMS (Root Mean Square) 계산
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      // 0-255 스케일로 변환 (실제 음압에 비례)
      // rms 범위: 0.0 (침묵) ~ 0.3 (매우 큰 소리)
      // 스케일 팩터: 300 (경험적 최적값)
      const volume = Math.min(255, Math.round(rms * 300));

      const duration = Date.now() - startTime;
      console.log(`   → RMS 분석: ${volume} (rms: ${rms.toFixed(4)}, ${duration}ms)`);

      return volume;
    } catch (error) {
      console.error('❌ RMS 분석 실패:', error);
      // 에러 시 null 반환 → 손상된 세그먼트 폐기
      return null;
    }
  };

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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 [프론트엔드] LLM 분석 시작`);
    console.log(`   → 세그먼트 수: ${totalSegments}개`);
    console.log(`   → 총 녹음 시간: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}초)`);

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
      console.log(`🌐 API 호출 준비:`);
      console.log(`   → URL: ${import.meta.env.VITE_API_BASE_URL}/voice/analyze`);
      console.log(`   → Auth Token: ${localStorage.getItem('authToken') ? '✅ 있음' : '❌ 없음'}`);

      const analysisStartTime = Date.now();
      console.log(`⏱️ API 호출 시작... (${new Date().toISOString()})`);

      try {
        const result = await analyzeVoice(mergedBlob);
        const analysisTime = Date.now() - analysisStartTime;

        console.log(`✅ [프론트엔드] API 응답 성공 (${analysisTime}ms, ${(analysisTime / 1000).toFixed(1)}초)`);
        console.log(`   → 텍스트: "${result.text || '(없음)'}"`);
        console.log(`   → 포장 의도: ${result.takeout ? '✅ 예' : '❌ 아니오'}`);
        console.log(`   → 확신도: ${result.confidence} (${(result.confidence * 100).toFixed(0)}%)`);
        console.log(`   → 이유: ${result.reason}`);

        // 결과 처리
        if (result.confidence >= highThreshold && result.takeout) {
          // 확정 → 포장 감지
          console.log(`\n🎉 [결과] 포장 의도 확정!`);
          console.log(`   → Confidence: ${result.confidence} >= ${highThreshold} (highThreshold)`);
          console.log(`   → 액션: 콜백 호출 및 녹음 중지`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          stopRecording();
          onTakeoutDetected(0);

        } else if (result.confidence >= lowThreshold && result.confidence < highThreshold && result.takeout) {
          // 애매함 → 추가 녹음
          if (totalDuration >= maxTotalDuration) {
            console.log(`\n⏱️ [결과] 최대 시간 도달`);
            console.log(`   → 총 녹음 시간: ${totalDuration}ms >= ${maxTotalDuration}ms (maxTotalDuration)`);
            console.log(`   → 액션: 녹음 재시작`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            stopRecording();
            setTimeout(() => startRecordingRef.current?.(), 1000);
          } else {
            console.log(`\n⏳ [결과] 추가 녹음 진행`);
            console.log(`   → Confidence: ${result.confidence} (${lowThreshold} ~ ${highThreshold} 사이)`);
            console.log(`   → 액션: 계속 녹음`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            setPhase('recording');
            // 계속 녹음 (interval이 자동으로 다음 세그먼트 처리)
          }

        } else {
          // 포장 아님 or 확신도 낮음 → 폐기 및 재시작
          console.log(`\n❌ [결과] 포장 의도 없음`);
          console.log(`   → Confidence: ${result.confidence} < ${lowThreshold} (lowThreshold)`);
          console.log(`   → 또는 takeout: ${result.takeout}`);
          console.log(`   → 액션: 녹음 재시작`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          stopRecording();
          setTimeout(() => startRecordingRef.current?.(), 1000);
        }

      } catch (apiError) {
        const analysisTime = Date.now() - analysisStartTime;
        console.error(`\n❌ [프론트엔드] API 호출 실패 (${analysisTime}ms)`);
        console.error('   → 에러:', apiError.message);
        console.error('   → 전체 에러:', apiError);
        throw apiError;
      }

    } catch (error) {
      console.error('\n❌ [프론트엔드] LLM 분석 실패');
      console.error('   → 에러 메시지:', error.message);
      console.error('   → 에러 스택:', error.stack);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      setError('음성 분석에 실패했습니다.');
      stopRecording();
      setTimeout(() => startRecordingRef.current?.(), 1000);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [segmentDuration, maxCumulativeDuration, windowSize, maxTotalDuration, lowThreshold, highThreshold, onTakeoutDetected, stopRecording]);

  // API 호출
  const analyzeVoice = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    // RMS 값들을 JSON으로 전달
    formData.append('rmsValues', JSON.stringify(rmsValuesRef.current));

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const url = `${apiBaseUrl}/voice/analyze`;

    console.log(`   → Fetch 시작: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: formData,
    });

    console.log(`   → HTTP 응답: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // 에러 응답 본문 읽기
      let errorBody;
      try {
        errorBody = await response.json();
        console.error('   → 에러 응답 본문:', errorBody);
      } catch (e) {
        errorBody = await response.text();
        console.error('   → 에러 응답 텍스트:', errorBody);
      }

      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('   → JSON 파싱 성공');

    return result;
  };

  // 녹음 중지
  const stopRecording = useCallback(() => {
    console.log('⏹️ 녹음 중지\n');

    // 자동 재시작 방지
    isListeningRef.current = false;
    setIsListening(false);
    setPhase('idle');

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
    setCurrentSegments(0);
    segmentsRef.current = [];
    currentSegmentChunksRef.current = [];
    rmsValuesRef.current = []; // RMS 값도 초기화
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
    stopRecording,
    startRecording,  // 외부에서 재시작 가능하도록
  };
};
