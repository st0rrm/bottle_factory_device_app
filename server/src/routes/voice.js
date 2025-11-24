const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 메모리에 파일 저장 (임시)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic 클라이언트 초기화
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 서버 시작 시 API 키 상태 확인
console.log('🔑 API 키 상태 확인:');
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ 설정됨 (길이: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ 없음'}`);
console.log(`  - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ 설정됨 (길이: ' + process.env.ANTHROPIC_API_KEY.length + ')' : '❌ 없음'}`);

/**
 * POST /api/voice/analyze
 * 음성을 텍스트로 변환하고 포장 의도를 분석합니다.
 *
 * Request:
 *   - multipart/form-data
 *   - audio: 음성 파일 (webm, mp3, wav 등)
 *
 * Response:
 *   {
 *     text: string,           // 인식된 텍스트
 *     takeout: boolean,       // 포장 의도 여부
 *     confidence: number,     // 확신도 (0.0 ~ 1.0)
 *     reason: string          // 판단 근거
 *   }
 */
router.post('/analyze', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({
        error: 'OpenAI API 키가 설정되지 않았습니다.',
        code: 'MISSING_OPENAI_KEY'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({
        error: 'Anthropic API 키가 설정되지 않았습니다.',
        code: 'MISSING_ANTHROPIC_KEY'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: '음성 파일이 필요합니다.' });
    }

    const startTime = Date.now();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎙️ 음성 분석 시작:', {
      timestamp: new Date().toISOString(),
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimetype: req.file.mimetype,
      cafe: req.user.cafeName,
      cafeId: req.user.cafeId,
    });

    // Step 1: OpenAI Whisper로 음성을 텍스트로 변환
    console.log('🎤 [1/2] Whisper API 호출 시작...');
    const whisperStartTime = Date.now();

    try {
      // OpenAI SDK를 위한 File 객체 생성
      const audioFile = new File(
        [req.file.buffer],
        'audio.webm',
        { type: req.file.mimetype || 'audio/webm' }
      );

      console.log('   → 오디오 파일 준비 완료:', {
        name: audioFile.name,
        size: `${(audioFile.size / 1024).toFixed(2)} KB`,
        type: audioFile.type,
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'ko',
        response_format: 'text',
      });

      const whisperDuration = Date.now() - whisperStartTime;
      console.log(`✅ Whisper 완료 (${whisperDuration}ms)`);
      console.log('   → 인식된 텍스트:', recognizedText || '(없음)');
      console.log('   → 텍스트 길이:', recognizedText.length, '자');

      if (!recognizedText) {
        console.log('⚠️ 음성이 인식되지 않음. 빈 응답 반환.');
        const totalDuration = Date.now() - startTime;
        console.log(`⏱️ 총 소요 시간: ${totalDuration}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return res.json({
          text: '',
          takeout: false,
          confidence: 0,
          reason: '음성이 인식되지 않았습니다.',
        });
      }

      // Step 2: Claude Haiku로 포장 의도 분석
      console.log('🤖 [2/2] Claude API 호출 시작...');
      const claudeStartTime = Date.now();

      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 150,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `다음은 카페 키오스크에서 사용자가 한 말입니다. 사용자가 포장(테이크아웃)을 원하는지 판단하세요.

발화: "${recognizedText}"

포장 관련 표현 예시:
- "포장", "테이크아웃", "가져갈게요", "들고갈게요", "싸주세요"
- "take out", "to go", "포장해주세요", "테잌아웃"
- "가지고 갈래요", "집에서 먹을게요", "가져가서 먹을게요"

JSON 형식으로만 답변하세요:
{
  "takeout": true 또는 false,
  "confidence": 0.0~1.0 사이의 숫자 (확신도),
  "reason": "판단 근거를 한 문장으로"
}`
          }
        ]
      });

      const claudeDuration = Date.now() - claudeStartTime;
      console.log(`✅ Claude 완료 (${claudeDuration}ms)`);

      // Claude 응답 파싱
      const responseText = message.content[0].text;
      console.log('   → Claude 원본 응답:', responseText);

      let result;

      try {
        // JSON 추출 (코드 블록이 있을 수 있음)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          console.log('   → JSON 파싱 성공');
        } else {
          throw new Error('JSON 형식이 아님');
        }
      } catch (parseError) {
        console.error('❌ Claude 응답 파싱 실패:', parseError.message);
        console.error('   → 원본 응답:', responseText);
        // 파싱 실패 시 기본값 반환
        result = {
          takeout: false,
          confidence: 0,
          reason: 'AI 응답 파싱 실패',
        };
      }

      // 최종 응답
      const response = {
        text: recognizedText,
        takeout: result.takeout || false,
        confidence: result.confidence || 0,
        reason: result.reason || '분석 완료',
      };

      const totalDuration = Date.now() - startTime;
      console.log('🎉 최종 분석 결과:', {
        text: response.text,
        takeout: response.takeout,
        confidence: response.confidence,
        reason: response.reason,
      });
      console.log(`⏱️ 총 소요 시간: ${totalDuration}ms (Whisper: ${whisperDuration}ms, Claude: ${claudeDuration}ms)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      res.json(response);

    } catch (innerError) {
      // Whisper 또는 Claude API 호출 중 에러
      throw innerError;
    }

  } catch (error) {
    console.error('❌ 음성 분석 오류:', error);
    console.error('에러 상세:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
    });

    // 에러 타입에 따른 응답
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return res.status(429).json({
        error: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        code: 'QUOTA_EXCEEDED',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // OpenAI API 에러
    if (error.code === 'invalid_api_key' || error.status === 401) {
      return res.status(500).json({
        error: 'API 인증 실패. API 키를 확인해주세요.',
        code: 'INVALID_API_KEY',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // Anthropic API 에러
    if (error.type === 'authentication_error') {
      return res.status(500).json({
        error: 'Claude API 인증 실패. API 키를 확인해주세요.',
        code: 'INVALID_ANTHROPIC_KEY',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // 타임아웃 에러
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'API 응답 시간 초과. 다시 시도해주세요.',
        code: 'TIMEOUT',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // 일반 에러
    res.status(500).json({
      error: '음성 분석 중 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/voice/status
 * 음성 인식 시스템 상태 확인 (API 키 유효성 체크)
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = {
      whisper: !!process.env.OPENAI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      enabled: !!(process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY),
    };

    res.json(status);
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({ error: '상태 확인 실패' });
  }
});

module.exports = router;
