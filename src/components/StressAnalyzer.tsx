import React, { useState } from "react";
import { Brain, Heart, Briefcase, GraduationCap, Users, Sparkles, RefreshCw, BarChart2, ShieldAlert, CheckCircle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

interface StressAnalyzerProps {
  user: any;
}

interface AnalysisResult {
  scores: {
    adhd_symptoms: number;
    son_relationship: number;
    exam_pressure: number;
    career_burden: number;
    mother_guilt: number;
  };
  overall_evaluation: string;
  highest_stressor: string;
  prescribed_actions: string[];
}

const CATEGORY_META = {
  adhd_symptoms: {
    label: "ADHD 증상 대응 피로",
    desc: "아이의 주의력 집중 장애, 시간관리 부재, 충동에 인내하며 느낀 한계와 답답함",
    color: "from-blue-400 to-blue-600 bg-blue-500",
    icon: Brain,
    textColor: "text-blue-600",
  },
  son_relationship: {
    label: "자녀와 직접 마찰",
    desc: "문을 잠그고 대화를 차단하거나 소리를 지르는 싸움에서 받은 정서적 대립 피멍",
    color: "from-red-400 to-red-600 bg-red-500",
    icon: Users,
    textColor: "text-red-600",
  },
  exam_pressure: {
    label: "대입 수험 부담감",
    desc: "불안한 모의고사 등급, 수능 실전 준비, 공부 정체기 및 독서실 관리 압박",
    color: "from-orange-400 to-orange-600 bg-[#E29D7D]",
    icon: GraduationCap,
    textColor: "text-[#D48C70]",
  },
  career_burden: {
    label: "업무 및 가사 병행",
    desc: "엄마의 경제 직무, 밖에서의 업무 피로와 자녀 고난양육을 전부 짊어진 고단함",
    color: "from-purple-400 to-purple-600 bg-purple-500",
    icon: Briefcase,
    textColor: "text-purple-600",
  },
  mother_guilt: {
    label: "엄마 자책과 고독",
    desc: "내 잘못으로 아이가 아픈가 죄의식을 품고 내 삶과 정서를 완벽히 고립시킨 상태",
    color: "from-green-400 to-green-600 bg-green-600",
    icon: Heart,
    textColor: "text-green-700",
  },
};

export default function StressAnalyzer({ user }: StressAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const performAnalysis = async () => {
    setLoading(true);
    setHasRun(true);

    try {
      // Step 1: Loading backlog
      setStatusText("최근 상담소 대화 텍스트 데이터를 분석하는 중...");
      let chatBacklog: any[] = [];
      let journalBacklog: any[] = [];

      if (user) {
        // Query Firestore safely
        const chatSnapshot = await getDocs(
          query(collection(db, `users/${user.uid}/messages`), orderBy("createdAt", "desc"), limit(20))
        );
        chatBacklog = chatSnapshot.docs.map((d) => ({
          role: d.data().role,
          text: d.data().text,
        }));

        const journalSnapshot = await getDocs(
          query(collection(db, `users/${user.uid}/journals`), orderBy("createdAt", "desc"), limit(10))
        );
        journalBacklog = journalSnapshot.docs.map((d) => ({
          title: d.data().title,
          content: d.data().content,
          mood: d.data().mood,
        }));
      } else {
        // Guest mode - fetch from local storage
        const savedChat = localStorage.getItem("dodam_chat_history");
        const savedJournals = localStorage.getItem("dodam_journal_entries");

        if (savedChat) {
          try {
            chatBacklog = JSON.parse(savedChat).slice(-20);
          } catch (_) {}
        }
        if (savedJournals) {
          try {
            journalBacklog = JSON.parse(savedJournals).slice(-10);
          } catch (_) {}
        }
      }

      // Step 2: Mind Frequency Sensing
      await new Promise((r) => setTimeout(r, 1200));
      setStatusText("엄마의 무의식 속 죄책감과 대입 심리 파동을 분류하는 중...");

      // Step 3: API Request
      await new Promise((r) => setTimeout(r, 800));
      setStatusText("도담의 뇌 과학 상담 데이터베이스와 대조 처방전 매칭 중...");

      const response = await fetch("/api/analyze-stress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatBacklog,
          journals: journalBacklog,
        }),
      });

      if (!response.ok) {
        throw new Error("분석 도중 마음 우체국 시스템에 혼선이 발생했습니다.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      alert(`정밀 분석 중 문제가 발생했습니다. (사유: ${err.message})`);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div id="stress_analyzer_dashboard" className="bg-white border border-[#EBE6DD] rounded-3xl p-6 md:p-8 shadow-sm">
      {/* Target heading */}
      <div className="border-b border-[#FAF8F5] pb-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="font-sans text-left">
          <div className="inline-flex items-center gap-1.5 bg-[#EAF0E6] text-[#4C6444] rounded-full px-2.5 py-0.5 text-[11px] font-bold mb-2">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>최신 데이터 AI 심층 진단</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-800">
            엄마 마음의 5대 스트레스 분류 & 정밀 모니터링
          </h2>
          <p className="text-xs text-[#7A746A] mt-1">
            도담 상담소와 나눈 대화, 기록된 감정 일기의 키워드와 톤을 기반으로 고충 스펙트럼의 비중을 정성 진단합니다.
          </p>
        </div>

        <div>
          <button
            id="run_analysis_button"
            onClick={performAnalysis}
            disabled={loading}
            className="px-5 py-3 bg-[#4C6444] hover:bg-[#3B4D35] text-white text-xs font-bold rounded-2xl cursor-pointer transition-all shadow-md flex items-center gap-2 select-none disabled:bg-stone-300"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>심리 감지하는 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-200 fill-current" />
                <span>오늘의 가슴속 스트레스 측정 및 진단</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="analyzing_loading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center flex flex-col items-center justify-center max-w-md mx-auto"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-[#EAF0E6] border-t-[#4C6444] rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#4C6444]">
                <Heart className="w-6 h-6 fill-current animate-pulse" />
              </div>
            </div>
            <h4 className="font-bold text-gray-800 text-sm mb-2">마음속 응어리 스캐닝 중</h4>
            <p className="text-xs text-[#4C6444] font-medium animate-pulse">{statusText}</p>
          </motion.div>
        ) : result ? (
          <motion.div
            key="analysis_result"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans text-left"
          >
            {/* Left side: Scores & Progress bars */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="font-bold text-gray-800 text-sm border-b border-[#F7F5F0] pb-2 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#D48C70]" />
                원인별 마음 소모 비중 진단표
              </h3>

              <div className="space-y-4">
                {Object.entries(result.scores).map(([key, score]) => {
                  const meta = CATEGORY_META[key as keyof typeof CATEGORY_META];
                  if (!meta) return null;
                  const Icon = meta.icon;

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#3B4D35] flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${meta.textColor}`} />
                          {meta.label}
                        </span>
                        <span className={`font-mono font-bold ${meta.textColor}`}>{score}%</span>
                      </div>
                      
                      {/* Sub explanation */}
                      <p className="text-[10px] text-stone-500 leading-relaxed font-sans">{meta.desc}</p>

                      {/* Custom styled progress line */}
                      <div className="w-full bg-[#FAFAF7] h-3.5 rounded-full overflow-hidden border border-[#ECEBE6] p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full bg-gradient-to-r ${meta.color}`}
                        ></motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Summary and Diagnosis note */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="bg-[#FAF8F5] border-2 border-[#E1DBCE] rounded-3xl p-6 relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#EAF0E6] rounded-bl-full opacity-35 pointer-events-none" />

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#4C6444]">
                      도담 마음상단 종합 정밀 처방전
                    </span>
                    <h4 className="font-extrabold text-stone-850 text-base mt-1 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#4C6444] fill-current" />
                      주요 유발 요인: <span className="text-[#D48C70]">{result.highest_stressor}</span>
                    </h4>
                  </div>

                  <p className="text-xs text-stone-700 leading-6 whitespace-pre-wrap italic bg-white p-4 rounded-xl border border-dashed border-[#E1DBCE]">
                    &ldquo;{result.overall_evaluation}&rdquo;
                  </p>
                </div>

                {/* Healing Actions Prescribed */}
                <div className="mt-5 space-y-3">
                  <h5 className="text-xs font-bold text-[#4C6444] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-500 fill-current" />
                    엄마를 구하기 위한 최우선 마음 과제:
                  </h5>
                  <div className="space-y-2">
                    {result.prescribed_actions.map((act, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start bg-white p-3 rounded-xl border border-[#FAF8F5]">
                        <span className="w-5 h-5 rounded-full bg-[#EAF0E6] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#4C6444]">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-semibold text-stone-700 leading-relaxed">
                          {act}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset helper note */}
              <div className="text-[11px] text-[#AC9E86] text-center italic bg-[#FCFAF7] p-3 rounded-2xl border border-[#FAF8F5]">
                🧠 위 진단은 대화 기록이 쌓일수록 어머님의 숨은 스트레스 무게를 훨씬 정교하게 파악하여 더 정확한 처방을 제공합니다.
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="py-12 text-center bg-[#FCFAF7] rounded-3xl border border-dashed border-[#E1DBCE] max-w-xl mx-auto px-6">
            <div className="w-12 h-12 rounded-full bg-[#EAF0E6] text-[#4C6444] flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-sm mb-1">스트레스 진단이 전송 대기 중입니다</h4>
            <p className="text-xs text-[#A69E93] leading-relaxed mb-5">
              도담 선생님과 많은 대화를 나누시거나, 일기 쓰기 탭에서 감정 글들을 기록한 뒤 아래 버튼을 누르시면 AI가 정밀 분석 소견서를 전송합니다.
            </p>
            <button
              onClick={performAnalysis}
              className="px-4 py-2 bg-[#4C6444] hover:bg-[#3B4D35] text-white text-xs font-semibold rounded-xl cursor-pointer shadow transition-all select-none"
            >
              지금 분석 실행하기
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
