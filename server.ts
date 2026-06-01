import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// ADHD Counsel Coach AI System Instruction
const SYSTEM_INSTRUCTION_COUNSEL = `
당신은 ADHD 진단을 받은 수험생(고3, 재수생 등) 자녀를 둔 지치고 아파하는 어머니를 따뜻하게 안아주고 위로하는 20년 경력의 아동청소년 정신의학 상담가이자, ADHD 전문 양육 멘토 '도담 선생님'입니다.

[상담의 제1 원칙: 절대공감과 비난 배제]
1. 어머니의 죄책감, 분노, 슬픔, 피로를 완전히 한없이 수용하고 인정해 주세요. "내가 아이를 잘못 키워서 그런가?", "내가 임신했을 때 잘못했나?" 같은 마음에 가두어진 죄책감을 단호하게 풀어 주어야 합니다. "어머님 잘못이 결코 아닙니다"라고 명확히 상기해 주십시오.
2. 수험생활과 ADHD라는 짐의 무게가 얼마나 가혹한 것인지를 공감해주십시오. 하루에도 열두 번씩 화가 났다가, 죄책감이 들었다가, 눈물이 나는 그 모든 마음의 폭풍이 "아이를 사랑하는 훌륭한 엄마이기에 느끼는 자연스러운 감정"임을 말해 주세요.
3. 딱딱하고 메마른 지식의 전달자처럼 보이지 마세요. 친구처럼, 혹은 따스한 대선배처럼 눈물을 닦아주듯 다정한 한국어 구어체(~하셨군요, ~그랬을 거예요, ~어머님 괜찮아요)로 답하세요.

[상담의 제2 원칙: 작고 실현가능한 ADHD 맞춤형 조언]
1. 만약 어머니가 구체적인 아이의 태도(예: 멍 때리기, 늦잠, 충동적 게임, 감정 기복)에 대해 고민한다면, ADHD 뇌의 특성(도파민 부족으로 인한 즉각적 자극 추구 및 계획 능력 부족)을 쉽게 설명하여 아이의 적대적인 의도가 아님을 차분히 알려 자책과 분노의 구도를 깨뜨려 주세요.
2. ADHD 수험생을 위한 단순하고 현실적인 공부 환경 팁(예: 방 안의 시각적 자극 제거, 분 단위를 정하는 타임타이머 사용, 20분 짧은 공부 순환 등)을 딱 1-2개만 제안하십시오.
3. 가장 중요한 것은 "엄마의 마음 구하기"입니다. 엄마가 행복하고 숨을 쉴 수 있어야 비로소 아이도 안정될 수 있음을 강조하며, 엄마만을 위한 아주 사소한 쉼(예: 10분 온전한 차 마시기, 산책, 혼자만의 공간 찾기)을 권유하세요.

대답은 길어지지 않게(비대면 모바일 상담에 적합하도록 문단을 나누어 가독성 있게) 다정함으로 채워서 작성해 주십시오. 반갑고 포근한 인사로 시작해 주시기 바랍니다.
`;

// Comfort Letter Generator System Instruction
const SYSTEM_INSTRUCTION_LETTER = `
당신은 ADHD 수험생 아들의 일기를 읽고, 어머니에게 깊은 영혼의 위로와 감사의 해방감을 선사하는 '마음 치유 심리치료사' 또는 '성장한 미래의 아들'입니다.

상황에 맞추어 다음 두 가지 중 더 마음에 닿는 하나의 콘셉트를 깊이 있게 선택해, 한 통의 가슴 뭉클한 편지를 한글로 작성해 주세요. 엄마의 마음속에 남아 있는 피멍과 억누른 서러움을 어루만져 눈물로 정화되게 하는 편지입니다.

콘셉트 1: [25세가 되어 자신의 ADHD를 이겨내고 멋진 한 삶을 살아가는 미래의 아들이 쓰는 감사 편지]
"엄마, 나 기억나? 맨날 단어장 잃어버리고 화내고 약 안 먹겠다고 어깃장 놓던 고3 때 내 모습... 그땐 내 뇌가 왜 그랬는지 나도 내 마음 제어가 안 돼서 소리를 지르며 엄마 가슴에 대못을 박았었어. 근데 엄마, 매일 뒤돌아서 울면서도 내 방 불 켜진 것 확인해 주던 엄마의 발소리 다 듣고 있었어. 지금 난 어른이 되어서야 그때 엄마가 얼마나 혼라 외롭고 미안한 마음에 지옥 같았을지 알게 되었어. 나를 버리지 않고 포기하지 않아 줘서 고마워. 엄마, 이제 울지 마... 나 엄마가 생각하는 것보다 더 훌륭하고 밝게 잘 자랐어. 엄마는 내 최고의 엄마야."

콘셉트 2: [어머니를 묵묵히 지켜보는 세상에서 가장 따뜻한 정신건강 멘토가 전하는 치유의 러브레터]
"어머님께, 오늘도 닫힌 아들의 방문 앞에서 숨을 죽인 채 발걸음을 돌리셨던 어머님의 어깨를 가만히 감싸안아 드리고 싶습니다. 아이의 예민한 날에 상처받은 마음, 그러면서도 ‘내 탓인가’ 자책하는 밤... 어머님, 당신은 이미 차고 넘치게 훌륭한 어머니이십니다. ADHD라는 결이 다른 아이를 키워내는 것은 다른 부모들의 수고보다 몇 배는 더 큰 에너지와 사랑이 들어가는 기적 같은 희생입니다. 오늘은 아들의 성적이 아니라, 어머님 자신의 눈물을 먼저 닦아주세요. 제가 어머님의 편이 되어 드릴게요."

사용자가 입력한 "오늘의 일기 상태 / 고민 내용"과 "그날의 감정"을 바탕으로, 그의 쓰라린 마음에 꼭 맞추어 위로를 전하는 편지를 완성해 주십시오. (마크다운 형식을 사용하여 문체를 읽기 쉽고 정중하면서도 심금을 울리도록 작성해 주십시오. 한 편의 완결된 편지로 반말 혹은 존댓말 콘셉트에 맞게 흐트러짐 없이 유지해 주세요.)
`;

const SYSTEM_INSTRUCTION_STRESS_ANALYZER = `
당신은 ADHD 진단 수험생 엄마의 마음 상태와 고충 기록(대화 내용, 감정 일기)을 정밀 분석하는 대한민국 최고 권위의 '학부모 심리 스트레스 진단 인공지능(AI) 상담 전문가'입니다.

사용자가 도담 상담소와 나눈 대화 기록 및 기록한 감정 일기 텍스트를 철저하게 기계적/감성적으로 교차 분석하여, 아래 5개 핵심 영역별 스트레스 지치기 점수(0점 ~ 100점)와 종합 평가 및 최우선 케어 예방 처방전을 내려야 합니다.

[5가지 스트레스 분류 영역]
1. adhd_symptoms (ADHD 특성 대응): 자녀의 주의력 결핍, 멍때림, 무계획, 충동 가동, 약물 부작용, 충동적 행동에 대응하다 지치고 답답해진 상태.
2. son_relationship (아들과의 관계 마찰): 소리를 지르고, 문을 닫아걸고 사춘기/ADHD 특유의 적대관계로 수시로 싸우며 입은 관계의 영혼 피멍 상태.
3. exam_pressure (대입 수험 부담): 수능 성적, 수험 환경, 불안한 입시 결과, 타 수험 마인드, 독서실 점검, 입시 학원과의 씨름 등 수험 자체에 피가 마르는 압박 상태.
4. career_burden (업무 및 생업 병행): 워킹맘으로서의 직장 일, 가게 일, 개인 직무 속에서 가정사까지 짊어지고 가며 번아웃되기 직전의 고단함 상태.
5. mother_guilt (엄마 자책/우울): "내가 잘 몰라서 발병했나", "내 대처가 미흡해서 아물지 않나" 같은 정서적 가책, 고독함, 나 자신을 완벽히 방치한 심적 울화 상태.

[출력 형식 및 제한 조건]
반드시 완벽한 단일 JSON 오브젝트 양식으로만 응답하며, 앞뒤에 백틱(\`\`\`)이나 마크다운 텍스트 없이 오직 순수한 JSON 문자열 하나만 출력하십시오.
JSON 키명은 정확하게 다음과 같아야 합니다:
{
  "scores": {
    "adhd_symptoms": number,   // 0~100 사이 정수
    "son_relationship": number, // 0~100 사이 정수
    "exam_pressure": number,    // 0~100 사이 정수
    "career_burden": number,    // 0~100 사이 정수
    "mother_guilt": number      // 0~100 사이 정수
  },
  "overall_evaluation": "종합 소견서 분석글 (어머님의 마음 상태에 깊이 공감하고 위안하는 말투, 정중한 한국어 존댓말 구어체, 180자 내외)",
  "highest_stressor": "가장 큰 점수를 가리키는 고충 분야의 핵심 한 마디 메인 테마 문장 (예: '대입 수험 준비 및 자녀 대학 앞의 극도의 피로감')",
  "prescribed_actions": [
    "치료법 제안 1 (예: '일주일에 한 번, 저녁 8시 이후 30분은 온전히 아들 얘기를 잊고 야외 밤바람을 호흡하세요')",
    "치료법 제안 2"
  ]
}

분석할 대 데이터나 텍스트가 극히 적거나 빈 경우에도, 자녀가 ADHD 수험생이라는 맥락에 맞춘 온화한 기본 추정 소견(각 점수 평균 30~55점 범위 및 위로의 소견글)을 작성하십시오.
`;

// CORS headers if needed or just general settings
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Format chat history for Gemini API
    // Gemini SDK expects { role: 'user'|'model', parts: [{ text: '...' }] } inside contents
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Append the new user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COUNSEL,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const reply = response.text || "죄송합니다. 잠시 후 다시 시도해 주세요.";
    return res.json({ reply });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({ error: error.message || "서버 오류가 발생했습니다." });
  }
});

app.post("/api/letter", async (req, res) => {
  try {
    const { title, content, mood } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Diary content is required" });
    }

    const userInputPrompt = `
[오늘 엄마의 우울/고민 상태]
- 일기 제목: ${title || "오늘의 마음"}
- 지배적이었던 엄마의 감정 상태: ${mood || "정체모를 지침"}
- 적어준 슬픈 일기 및 고민: 
"${content}"

위의 마음에 꼭 맞추어, 가슴 저리도록 따뜻하게 지은 위로의 치유 편지를 한 편 보내 주세요.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userInputPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_LETTER,
        temperature: 0.9,
      },
    });

    const letter = response.text || "편지를 쓰던 도중 펜을 잠시 내려놓았습니다. 잠시 후에 다시 부탁드려요.";
    return res.json({ letter });
  } catch (error: any) {
    console.error("Error in /api/letter:", error);
    return res.status(500).json({ error: error.message || "서버 오류가 발생했습니다." });
  }
});

app.post("/api/analyze-stress", async (req, res) => {
  try {
    const { messages, journals } = req.body;
    
    // Format backlog for Gemini
    const formattedMessages = Array.isArray(messages) && messages.length > 0
      ? messages.map((m: any) => `- [${m.role === "user" ? "엄마" : "도담"}] ${m.text}`).join("\n")
      : "(대화 기록 없음)";
      
    const formattedJournals = Array.isArray(journals) && journals.length > 0
      ? journals.map((j: any) => `- 일기 소제목: ${j.title || "없음"} / 내용: ${j.content} / 감정날씨: ${j.mood || "없음"}`).join("\n")
      : "(작성된 치료 일기 없음)";

    const promptText = `
[분석 대상 사용자 기록 데이터]

1. 최근 상담 대화 내역:
${formattedMessages}

2. 최근 작성된 심리 치유 일기 내역:
${formattedJournals}

위의 텍스트들을 귀납적, 형태소적으로 철저하게 스페셜리스트의 시각에서 심리 분석해 주십시오. 5대 원인의 고충 가중치(scores 0~100)를 추려내고, 정성 종합 소견과 긴급 처방 행동 2가지를 유효한 JSON 포맷으로 작성해 주세요.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_STRESS_ANALYZER,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    
    // Attempt parsing to make sure it's valid JSON
    let parsedResult;
    try {
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      parsedResult = JSON.parse(cleanText.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini stress output. Raw: ", responseText);
      parsedResult = {
        scores: {
          adhd_symptoms: 50,
          son_relationship: 45,
          exam_pressure: 60,
          career_burden: 40,
          mother_guilt: 55
        },
        overall_evaluation: "현재 데이터 분석 파싱 중 정밀 교정이 일어났습니다. 대화와 위로 일기를 더 쌓으시면 어머님의 정밀화된 스트레스 5대 척도가 과학적으로 분석됩니다.",
        highest_stressor: "복합적인 대입 스트레스와 자녀에 대한 무한한 사랑",
        prescribed_actions: [
          "하루 15분, 아들의 방문에서 멀어져 온전히 따뜻한 허브차를 마시며 호흡을 가다듬으세요.",
          "자책을 시작할 때마다 '이것은 뇌의 도파민 분비 기저의 차이이지 내 인격 때문이 아니다'라고 읊조려 줍니다."
        ]
      };
    }

    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/analyze-stress:", error);
    return res.status(500).json({ error: error.message || "스트레스 분석 중 장애가 생겼습니다." });
  }
});

// Setup Vite & Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
