import React, { useState, useEffect } from "react";
import { Heart, Sparkles, MessageSquare, BookOpen, Wind, Compass, ChevronRight, Award, CheckCircle, Flame, ShieldAlert, LifeBuoy, BarChart2 } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle, logOut, db } from "./lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import CounselorChat from "./components/CounselorChat";
import HeartJournal from "./components/HeartJournal";
import BreathingMeditation from "./components/BreathingMeditation";
import StressAnalyzer from "./components/StressAnalyzer";
import { PRESET_TIPS } from "./data";
import { TipItem, TipCategory } from "./types";
import { motion, AnimatePresence } from "motion/react";

const TIPS_CATEGORIES = [
  { key: "all", label: "전체 마음 백과" },
  { key: "adhd", label: "ADHD 뇌 이해하기" },
  { key: "mother", label: "엄마의 마음 구하기" },
  { key: "exam_prep", label: "수험 생활 맞춤 처방" },
  { key: "healing", label: "죄책감 덜어내기" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "journal" | "breathing" | "analyzer">("chat");
  const [selectedTipCategory, setSelectedTipCategory] = useState<TipCategory | "all">("all");
  const [selectedTip, setSelectedTip] = useState<TipItem | null>(PRESET_TIPS[0]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Monitor Firebase auth state & initialize users profile document
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Automatically initialize User profile doc inside '/users/{userId}' as per security blueprint
        const userRef = doc(db, "users", currentUser.uid);
        try {
          await setDoc(
            userRef,
            {
              uid: currentUser.uid,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Firestore user profile merge sync error:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredTips = PRESET_TIPS.filter(
    (tip) => selectedTipCategory === "all" || tip.category === selectedTipCategory
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 font-sans selection:bg-[#EAF0E6] selection:text-[#4C6444]">
      {/* Decorative Warm Banner Top */}
      <div className="bg-[#4C6444] text-stone-100 py-2.5 px-4 text-center text-xs font-serif flex items-center justify-center gap-2 select-none">
        <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-current" />
        <span>"어머님의 잘못이 결코 아닙니다." ADHD 수험생 아들을 안아주는 모든 어머님을 세상이 깊이 응원합니다.</span>
      </div>

      {/* App Header Area */}
      <header className="border-b border-[#EBE6DD] bg-white sticky top-0 z-40 shadow-sm backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF0E6] flex items-center justify-center text-[#4C6444] shadow-sm">
              <Heart className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 font-sans flex items-center gap-2">
                도담 마음상담소
              </h1>
              <p className="text-xs text-[#7A746A]">ADHD 진단 수험생 엄마의 죄책감 정화와 위로 쉼터</p>
            </div>
          </div>

          <div className="flex items-center flex-col sm:flex-row gap-4">
            {/* Navigation Controls */}
            <div className="flex bg-[#F2EDE4] p-1 rounded-2xl border border-[#E1DBCE]">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-[#7A746A] hover:text-stone-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>선생님 대화</span>
              </button>
              <button
                onClick={() => setActiveTab("journal")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "journal"
                    ? "bg-[#D48C70] text-white shadow-sm"
                    : "text-[#7A746A] hover:text-stone-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>치유 편지</span>
              </button>
              <button
                onClick={() => setActiveTab("breathing")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "breathing"
                    ? "bg-[#4C6444] text-white shadow-sm"
                    : "text-[#7A746A] hover:text-[#4C6444]"
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>온전한 쉼 호흡</span>
              </button>
              <button
                onClick={() => setActiveTab("analyzer")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "analyzer"
                    ? "bg-stone-800 text-stone-100 shadow-sm"
                    : "text-[#7A746A] hover:text-stone-900"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>마음 진단 분석</span>
              </button>
            </div>

            {/* Authentication Integration Button in Header */}
            {!authLoading && (
              <div className="flex items-center gap-2.5">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#FCFAF5] border border-[#EBE6DD] px-3 py-1.5 rounded-xl shadow-sm">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "어머님"}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#EAF0E6] text-[#4C6444] text-[10px] font-bold flex items-center justify-center">
                          엄
                        </div>
                      )}
                      <span className="text-xs text-stone-700 font-medium">{user.displayName || "어머님"} 님</span>
                    </div>
                    <button
                      id="google_logout_button"
                      onClick={logOut}
                      className="text-xs text-stone-400 hover:text-[#D48C70] transition-colors cursor-pointer"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <button
                    id="google_login_button"
                    onClick={async () => {
                      try {
                        await signInWithGoogle();
                      } catch (e) {
                        alert("구글 로그인 팝업 창을 닫았거나 실패했습니다. 다시 연결해 보세요.");
                      }
                    }}
                    className="px-3.5 py-2 bg-[#4C6444] hover:bg-[#3B4D35] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-md hover:scale-[1.01]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-250 animate-pulse" />
                    <span>구글 로그인 (백엔드 저장)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Inner Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-12">
        {/* Urgent emotional support header box */}
        <section className="bg-gradient-to-r from-[#FAF8F5] to-white border border-[#EBE6DD] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-2 max-w-xl text-left font-sans">
            <div className="inline-flex items-center gap-1.5 bg-[#FDF3EE] text-[#D48C70] rounded-full px-3 py-1 text-[11px] font-semibold">
              <Award className="w-3.5 h-3.5 fill-current" />
              <span>지친 어머니의 피로 전력 충전소</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-gray-800">
              오늘 하루도 아들에게 참는다는 게 한없이 괴로우셨죠?
            </h2>
            <p className="text-xs text-[#7A746A] leading-relaxed">
              성적이 안 나올까 봐 졸이는 가슴, 화내다가도 돌아서서 아픈 자식의 볼을 보며 '내 탓'이라 자책하는 밤... <br />
              여기서는 잠시 엄마라는 무거운 가방을 내려놓고 마음껏 울고, 화내고, 다시 일어서실 수 있는 에너지를 충전합니다.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end font-sans">
            <button
              onClick={() => setActiveTab("journal")}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-stone-100 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              <span>마음 편지 받아보기</span>
            </button>
            <button
              onClick={() => setActiveTab("breathing")}
              className="px-4 py-2.5 bg-[#EAF0E6] hover:bg-[#DCE7D6] text-[#4C6444] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>1분 뇌 숨쉬기</span>
            </button>
          </div>
        </section>

        {/* Tab View switching with Animation */}
        <div id="active_tab_module_frame">
          <AnimatePresence mode="wait">
            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <CounselorChat user={user} />
              </motion.div>
            )}

            {activeTab === "journal" && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <HeartJournal user={user} />
              </motion.div>
            )}

            {activeTab === "breathing" && (
              <motion.div
                key="breathing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <BreathingMeditation />
              </motion.div>
            )}

            {activeTab === "analyzer" && (
              <motion.div
                key="analyzer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <StressAnalyzer user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic ADHD parenting and healing golden guide (빛과 소금의 비결) */}
        <section id="adhd_golden_tips" className="bg-white border border-[#EBE6DD] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F2EFE8] pb-4">
            <div>
              <h3 className="font-sans font-bold text-gray-800 text-lg flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#4C6444]" />
                빛과 소금의 ADHD 비결백과
              </h3>
              <p className="text-xs text-[#7A746A]">소리 지르고 후회하는 악순환을 성찰하는 멘토링 노트</p>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1 font-sans">
              {TIPS_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedTipCategory(cat.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    selectedTipCategory === cat.key
                      ? "bg-[#4C6444] text-white"
                      : "bg-[#FAFAF7] text-stone-600 hover:bg-[#F2EFE8]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 font-sans">
            {/* Left Col: Tips list */}
            <div className="md:col-span-5 space-y-3 max-h-[380px] overflow-y-auto pr-2">
              {filteredTips.map((tip) => (
                <div
                  key={tip.id}
                  onClick={() => setSelectedTip(tip)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedTip?.id === tip.id
                      ? "bg-[#EAF0E6]/50 border-[#4C6444] shadow-sm font-semibold"
                      : "bg-[#FCFAF7] border-[#EBE6DD] hover:border-stone-400"
                  }`}
                >
                  <h4 className="text-xs text-stone-850 font-bold mb-1 truncate">
                    {tip.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1">
                    {tip.description}
                  </p>
                </div>
              ))}
              {filteredTips.length === 0 && (
                <div className="text-center py-8 text-xs text-stone-400">
                  해당 주제의 멘토링 노트가 준비 중입니다.
                </div>
              )}
            </div>

            {/* Right Col: Active Tip detail card display */}
            <div className="md:col-span-7">
              <AnimatePresence mode="wait">
                {selectedTip ? (
                  <motion.div
                    key={selectedTip.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 bg-[#FCFAF7] border border-[#E6DEC9] rounded-2xl h-full flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#4C6444]">
                        <span className="w-1.5 h-1.5 bg-[#4C6444] rounded-full"></span>
                        <span>
                          {selectedTip.category === "adhd" && "ADHD 뇌 성찰"}
                          {selectedTip.category === "mother" && "상호 감정 성찰"}
                          {selectedTip.category === "exam_prep" && "수험생 환경 처방"}
                          {selectedTip.category === "healing" && "죄책감 지우기"}
                        </span>
                      </div>
                      <h4 className="font-sans font-bold text-gray-900 text-sm md:text-base">
                        {selectedTip.title}
                      </h4>
                      <p className="text-xs font-semibold text-[#D48C70] leading-relaxed italic bg-white p-3 rounded-xl border border-[#FAFAF7]">
                        &ldquo;{selectedTip.description}&rdquo;
                      </p>
                      <p className="text-xs text-stone-650 leading-6 whitespace-pre-wrap pt-2">
                        {selectedTip.content}
                      </p>
                    </div>

                    <div className="border-t border-[#EBE6DD] pt-4 mt-6 flex items-center justify-between text-[11px] text-[#918878]">
                      <span>빛과 소금의 도담 백과사전 단원 12집</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                        어머님 힘내세요!
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-20 text-xs text-stone-400 border border-dashed border-[#EBE6DD] rounded-2xl h-full flex items-center justify-center">
                    왼쪽 목록에서 읽고 싶으신 비결을 하나 선택해주세요.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Safe and Sound Guidance Board */}
        <section className="bg-[#FCFAF7] border border-[#EBE6DD] rounded-3xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#EAF0E6] flex items-center justify-center text-[#4C6444]">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h4 className="font-sans font-semibold text-xs text-[#42553B]">실시간 클라우드 보존</h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              상단의 <b>구글 로그인</b>을 활용해 연결하시면, 상담 데이터 및 위로 일기가 <b>보안 백엔드 클라우드 서비스(Firestore)</b>에 매달 저장되어 기기가 교체되어도 평생 온전히 연동됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#FDF3EE] flex items-center justify-center text-[#D48C70]">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <h4 className="font-sans font-semibold text-xs text-stone-850">함께하는 구명정 멘토칭</h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              혹시 아들에게 감정 폭발을 한 뒤라면 자책하기 쉬운 마음을 <b>온전한 쉼 호흡 명상</b>을 작동하여 4초간 조용히 숨을 돌리세요. 수험생의 뇌 폭풍을 진정시키는 비결은 엄마의 느린 눈빛 호흡 뿐입니다.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="font-sans font-semibold text-xs text-stone-850">성실한 미래의 위안</h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              <b>치유 편지</b> 탭에서는 훗날 자신의 아픔을 의젓하게 이겨내고 성인이 된 아들이 엄마의 깊던 수고를 헤아리며 보내오는 감사장 편지가 생성됩니다. 위로의 눈물과 사랑을 함께 가슴 깊숙이 품으시길 기원합니다.
            </p>
          </div>
        </section>
      </main>

      {/* Footer Disclaimer & Branding */}
      <footer className="border-t border-[#EBE6DD] bg-white py-8 mt-12 text-center text-xs text-[#9E978C] space-y-2 font-sans">
        <p>© 2026 도담 마음상담소. All Rights Reserved. (Mothers Healing Station)</p>
        <p className="max-w-md mx-auto leading-relaxed text-[10px] text-[#ADA699] px-4">
          본 감정 케어 시스템은 자녀의 치료 의사 결정이나 전문 의료적 소견을 완전히 대체하지 않으며, ADHD 자녀 양육의 격가 속에서 마주하는 어머니들의 고단함과 죄책감 해방을 공감하는 일환인 심리 극복 서포팅 유틸리티입니다.
        </p>
      </footer>
    </div>
  );
}
