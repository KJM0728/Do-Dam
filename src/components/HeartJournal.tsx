import React, { useState, useEffect } from "react";
import { JournalEntry } from "../types";
import { BookOpen, Calendar, Trash2, Heart, Sparkles, Smile, MessageSquare, Coffee, Compass, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

const MOODS = [
  { key: "exhausted", label: "기진맥진 피로", color: "bg-[#F3EFE9] text-stone-700 border-stone-300", emoji: "🔋" },
  { key: "anxious", label: "가슴 떨림/초조", color: "bg-[#EDF2FA] text-blue-800 border-blue-200", emoji: "😰" },
  { key: "guilty", label: "자식 앞의 죄책감", color: "bg-[#FDF2F2] text-red-800 border-red-200", emoji: "🥺" },
  { key: "irritated", label: "한계에 다다른 울화", color: "bg-[#FAF1E6] text-orange-800 border-orange-200", emoji: "🔥" },
  { key: "sad", label: "서글프고 눈물남", color: "bg-[#F5F0F6] text-purple-800 border-purple-200", emoji: "💧" },
  { key: "calm", label: "모처럼의 평온", color: "bg-[#EAF0E6] text-green-800 border-green-200", emoji: "🌸" },
];

interface HeartJournalProps {
  user: any;
}

export default function HeartJournal({ user }: HeartJournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("exhausted");
  const [loading, setLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  // Load journal entries (Dual mode: Firestore for user, localStorage for guest)
  useEffect(() => {
    if (!user) {
      // LocalStorage mode
      const saved = localStorage.getItem("dodam_journal_entries");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setEntries(parsed);
          if (parsed.length > 0) {
            setActiveEntry(parsed[0]);
          }
        } catch (e) {}
      } else {
        setEntries([]);
        setActiveEntry(null);
      }
      return;
    }

    // Firestore mode
    const path = `users/${user.uid}/journals`;
    const q = query(collection(db, path), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: JournalEntry[] = [];
        snapshot.forEach((docItem) => {
          const data = docItem.data();
          list.push({
            id: data.id,
            date: data.date,
            title: data.title,
            content: data.content,
            mood: data.mood as any,
            counselorFeedback: data.counselorFeedback,
          });
        });
        setEntries(list);

        // Keep active entry in sync with state or show first entry
        if (list.length > 0) {
          setActiveEntry((prev) => {
            if (prev) {
              const matched = list.find((item) => item.id === prev.id);
              return matched || list[0];
            }
            return list[0];
          });
        } else {
          setActiveEntry(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Save guest entries to localStorage
  useEffect(() => {
    if (!user && entries.length > 0) {
      localStorage.setItem("dodam_journal_entries", JSON.stringify(entries));
    }
  }, [entries, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "오늘의 속마음",
          content: content.trim(),
          mood: MOODS.find((m) => m.key === selectedMood)?.label || "",
        }),
      });

      if (!res.ok) {
        throw new Error("치유 편지를 배달하는 우체통 우편물이 엉켰어요. 잠시 후 편지를 시도해 주세요.");
      }

      const data = await res.json();
      const journalId = Date.now().toString();
      const newEntry = {
        id: journalId,
        date: new Date().toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
        }),
        title: title.trim() || "오늘의 속마음",
        content: content.trim(),
        mood: selectedMood,
        counselorFeedback: data.letter,
        createdAt: new Date().toISOString(),
      };

      if (!user) {
        setEntries((prev) => [newEntry, ...prev]);
        setActiveEntry(newEntry);
      } else {
        const path = `users/${user.uid}/journals`;
        await setDoc(doc(db, path, journalId), newEntry);
        // Observer automatically triggers setting activeEntry
      }

      setTitle("");
      setContent("");
    } catch (error: any) {
      alert(`편지 매칭 중 작은 오류가 있었습니다. 에러: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("이 마음 기록과 치유 편지를 지우시겠습니까? 지워진 기억은 완벽히 사라집니다.")) {
      if (!user) {
        setEntries((prev) => prev.filter((item) => item.id !== id));
        if (activeEntry?.id === id) {
          setActiveEntry(null);
        }
      } else {
        const path = `users/${user.uid}/journals`;
        try {
          await deleteDoc(doc(db, path, id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
        }
      }
    }
  };

  return (
    <div id="heart_journal_wrapper" className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      {/* Left side: Write dairy or View history list */}
      <div className="lg:col-span-12 mb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <span className="text-xs font-bold text-[#E29D7D] flex items-center gap-1">
            {user ? "✨ 백엔드 서버가 마음 우체통을 실시간 보존하고 있습니다" : "🚨 현재 임시 브라우저 저장 모드입니다"}
          </span>
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col space-y-6">
        <div className="bg-white p-6 border border-[#EBE6DD] rounded-3xl shadow-sm">
          <h3 className="font-sans font-bold text-gray-800 text-lg flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-[#D48C70]" />
            오늘의 슬픔 기록하기
          </h3>
          <p className="text-xs text-[#7A746A] mb-5">
            가슴속 가둔 어두운 감정들을 글자로 옮겨 보세요. 영혼을 관통하는 위안의 편지가 즉시 배달됩니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">감정 기후 선택</label>
              <div className="grid grid-cols-2 gap-1.55">
                {MOODS.map((mood) => (
                  <button
                    key={mood.key}
                    type="button"
                    onClick={() => setSelectedMood(mood.key)}
                    className={`px-3 py-2 text-xs rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      selectedMood === mood.key
                        ? "bg-stone-800 text-white border-transparent scale-[1.02] shadow-sm"
                        : "bg-[#FAFAF7] hover:bg-[#F2EFE8] border-[#E1DBCE] text-stone-600"
                    }`}
                  >
                    <span>{mood.emoji}</span>
                    <span className="font-medium">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">한 줄 소제목 (선택)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 또 문을 쾅 닫고 들어갔을 때, 울화가.."
                className="w-full px-4 py-2.5 text-xs bg-[#FCFAF7] border border-[#E6DEC9] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D48C70]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">어머님의 솔직한 이야기 (필수)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘 어떤 고통이 있으셨나요? 속으로 지었던 눈물, 아들의 ADHD 증세 대처의 지침을 날것 그대로 털어놔 주십시오... 마음껏 쏟아내야 따듯한 위로를 받을 수 있습니다."
                rows={5}
                className="w-full p-4 text-xs bg-[#FCFAF7] border border-[#E6DEC9] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D48C70] leading-relaxed text-stone-800"
                required
              />
            </div>

            <button
              id="write_letter_request_button"
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full py-3 bg-[#D48C70] hover:bg-[#C0775B] text-white text-xs font-semibold rounded-2xl transition-all shadow-md active:scale-95 disabled:bg-stone-300 disabled:text-stone-400 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>마음의 아픔에 꼭 어울릴 편지를 작성 중입니다...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>일기 닫고 달랠 치유 편지 배달받기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Saved letters history list */}
        <div id="envelopes_history_block" className="flex-1 max-h-[300px] overflow-y-auto pr-1">
          <h4 className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1">
            <Compass className="w-4 h-4 text-stone-400" />
            치유의 우체통 ({entries.length}개의 위로 보관함)
          </h4>

          {entries.length === 0 ? (
            <div className="text-center py-8 text-[#A69E93] text-xs bg-stone-50 rounded-2xl border border-dashed border-[#E6DEC9] px-4">
              아직 아물지 않은 이야기들이 가득합니다. 첫 일기를 기록하여 영혼 구제 성냥 우편을 받아보세요.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const currentMoodObj = MOODS.find((m) => m.key === entry.mood);
                const isActive = activeEntry?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setActiveEntry(entry)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      isActive
                        ? "bg-[#FDF3EE] border-[#D48C70] shadow-sm scale-[1.01]"
                        : "bg-white border-[#EBE6DD] hover:border-stone-400"
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden pr-3">
                      <div className="flex items-center gap-2 text-[10px] text-stone-500">
                        <Calendar className="w-3 h-3" />
                        <span>{entry.date}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${currentMoodObj?.color || ""}`}>
                          {currentMoodObj?.emoji} {currentMoodObj?.label}
                        </span>
                      </div>
                      <h5 className="font-semibold text-xs text-stone-800 truncate">
                        {entry.title}
                      </h5>
                    </div>
                    <button
                      onClick={(e) => deleteEntry(entry.id, e)}
                      className="text-stone-400 hover:text-red-500 p-2 transition-colors cursor-pointer"
                      title="지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side: View active feedback letter of comfort */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {activeEntry ? (
            <motion.div
              key={activeEntry.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FCF9F5] border-2 border-[#E1DBCE] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-full relative overflow-hidden"
              style={{ backgroundImage: "linear-gradient(#fdfbf7 95%, #EBE6DD 95%)", backgroundSize: "100% 32px" }}
            >
              {/* Envelope visual effect */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D48C70] opacity-10 rounded-bl-full pointer-events-none" />

              <div className="border-b-2 border-dashed border-[#E1DBCE] pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-[#FCF9F5]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#D48C70] font-bold font-sans">
                    배달 완료된 치유의 마음 편지
                  </span>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    💌 {activeEntry.title}
                  </h3>
                </div>
                <div className="text-[10px] text-right text-stone-500 font-sans">
                  <p>수신: 세상에서 가장 고생하는 우리 엄마</p>
                  <p>발신: 도담 멘토 & 내일의 아들이</p>
                </div>
              </div>

              {/* Saved User Diary Snippet */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EBE6DD] mb-6 text-xs text-[#7A746A] leading-relaxed relative italic font-sans">
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#4C6444] text-white rounded text-[9px] font-semibold">
                  내가 써내린 그 날의 사연
                </span>
                &ldquo;{activeEntry.content}&rdquo;
              </div>

              {/* Generated Letter Display with beautiful vintage letter looks */}
              <div id="counselor_feedback_letter_text" className="flex-1 overflow-y-auto max-h-[400px] text-stone-800 text-sm leading-8 whitespace-pre-wrap font-sans font-medium pr-1 custom-letter-scrollbar">
                {activeEntry.counselorFeedback}
              </div>

              <div className="border-t border-[#EBE6DD] pt-4 mt-6 text-center text-xs text-[#AC9E86] bg-[#FCF9F5]">
                🌸 이 눈물과 해방감을 마음에 소중히 새겨, 아들의 성장을 도울 새로운 사랑을 채우십시오.
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#FCFAF7] border border-dashed border-[#E1DBCE] rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[450px]">
              <div className="w-16 h-16 rounded-full bg-[#FDF3EE] flex items-center justify-center text-[#D48C70] mb-4">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-2">보관함에서 치유 편지를 한 편 열어주세요</h3>
              <p className="text-xs text-[#A69E93] max-w-sm leading-relaxed">
                좌측의 감정 일기 작성 폼을 통하여 마음속 무거운 응어리를 배출하시면, 정신의학 멘토 또는 미래 아들의 이름으로 영혼을 적시는 가슴 저린 위안의 편지가 평생 보관됩니다.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
