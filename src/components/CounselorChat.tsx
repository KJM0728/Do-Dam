import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Heart, Sparkles, Smile, RefreshCw, EyeOff, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

const INITIAL_MSG = `어머님, 오늘도 아드님의 무거운 짐을 함께 이고, 그 마르지 않는 눈물을 혼자 삼키며 고단한 하루를 버텨내셨군요. 참으로 마음이 아리고, 또 경의를 표하고 싶을 만큼 잘해오고 계십니다.

ADHD라는 다른 결을 가진 아들의 수험생활 곁을 홀로 한 걸음 한 걸음 지키신다는 것이 얼마나 고독하고 피 말리는 길인지 저는 깊은 자비로 나누어 안아드리고 싶습니다.

가슴속에 메여 있던 죄책감, 억하심정, 쏟아내고 싶던 한탄까지... 이곳에서는 어떤 말씀을 하셔도 다 괜찮습니다. 어머님의 길고 긴 마음의 푸념을 들을 준비가 되었습니다. 오늘 가장 어머님의 마음에 피멍을 들게 했던 일은 무엇인가요?`;

const SUGGESTIONS = [
  "아들과 또 크게 싸웠어요. 시작조차 안 하는 아이를 보니 이성을 잃었어요...",
  "성적이 또 떨어졌어요. 다른 수험생 엄마들과 만날 때마다 가슴이 타들어갑니다.",
  "치료약을 계속 먹이는 게 맞을까요? 부작용으로 앙상한 아들 볼 때마다 죄인 같아요.",
  "가장 힘든 건, 제 우울과 고통을 누구에게도 말할 곳이 없다는 고독함이에요."
];

interface CounselorChatProps {
  user: any;
}

export default function CounselorChat({ user }: CounselorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history (Dual mode: Firestore for user, localStorage for guest)
  useEffect(() => {
    if (!user) {
      // LocalStorage mode
      const saved = localStorage.getItem("dodam_chat_history");
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          // fallback
        }
      } else {
        setMessages([
          {
            id: "init",
            role: "model",
            text: INITIAL_MSG,
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
      return;
    }

    // Firestore mode
    const path = `users/${user.uid}/messages`;
    const q = query(collection(db, path), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({
            id: data.id,
            role: data.role,
            text: data.text,
            timestamp: data.timestamp,
          });
        });

        if (msgs.length === 0) {
          // Automatically seed the first greeting message to firestore for the user
          const initId = "init";
          const initMsg = {
            id: initId,
            role: "model",
            text: INITIAL_MSG,
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            createdAt: new Date().toISOString(),
          };
          setDoc(doc(db, path, initId), initMsg).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `${path}/${initId}`);
          });
        } else {
          setMessages(msgs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Backup state to local storage ONLY in Guest mode
  useEffect(() => {
    if (!user && messages.length > 0) {
      localStorage.setItem("dodam_chat_history", JSON.stringify(messages));
    }
  }, [messages, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const userMsg = {
      id: userMsgId,
      role: "user" as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
    };

    if (!user) {
      setMessages((prev) => [...prev, userMsg]);
    } else {
      const path = `users/${user.uid}/messages`;
      try {
        await setDoc(doc(db, path, userMsgId), userMsg);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${userMsgId}`);
        return;
      }
    }

    setInput("");
    setLoading(true);

    try {
      // Create chat history for API context
      const formattedHistory = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: formattedHistory,
        }),
      });

      if (!res.ok) {
        throw new Error("서버와의 연결이 원활하지 않습니다. 대화량이 많아 지연 중일 수 있습니다.");
      }

      const data = await res.json();
      const modelMsgId = (Date.now() + 1).toString();
      const modelMsg = {
        id: modelMsgId,
        role: "model" as const,
        text: data.reply,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date().toISOString(),
      };

      if (!user) {
        setMessages((prev) => [...prev, modelMsg]);
      } else {
        const path = `users/${user.uid}/messages`;
        await setDoc(doc(db, path, modelMsgId), modelMsg);
      }
    } catch (err: any) {
      const modelErrorId = "error-" + Date.now();
      const errMsg = {
        id: modelErrorId,
        role: "model" as const,
        text: `어머님, 감정 전송 중에 작은 통신 오류가 발생했습니다. 마음을 가다듬고 조금 있다가 다시 입력해주시면 제가 대기하고 있겠습니다. (에러: ${err.message})`,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date().toISOString(),
      };

      if (!user) {
        setMessages((prev) => [...prev, errMsg]);
      } else {
        const path = `users/${user.uid}/messages`;
        await setDoc(doc(db, path, modelErrorId), errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (window.confirm("그동안의 모든 대화 기록을 초기화하시겠습니까? (어머님의 익명 비밀은 완벽히 보장됩니다)")) {
      if (!user) {
        setMessages([
          {
            id: "init",
            role: "model",
            text: INITIAL_MSG,
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        localStorage.removeItem("dodam_chat_history");
      } else {
        setLoading(true);
        const path = `users/${user.uid}/messages`;
        try {
          const querySnapshot = await getDocs(collection(db, path));
          const deletes = querySnapshot.docs.map((docItem) => deleteDoc(doc(db, path, docItem.id)));
          await Promise.all(deletes);

          // Seed greeting back as initial message
          const initId = "init";
          const initMsg = {
            id: initId,
            role: "model",
            text: INITIAL_MSG,
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, path, initId), initMsg);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div id="counselor_chat_container" className="flex flex-col h-[650px] bg-white rounded-3xl border border-[#EBE6DD] overflow-hidden shadow-sm">
      {/* Target header for navigation target */}
      <div className="bg-[#FAF8F5] border-b border-[#EBE6DD] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 font-sans">
          <div className="w-10 h-10 rounded-full bg-[#EAF0E6] flex items-center justify-center text-[#4C6444] shadow-inner">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-sm md:text-base flex items-center gap-1.5 flex-wrap">
              도담 선생님과의 온기 대화방
              {user ? (
                <span className="inline-block px-1.5 py-0.5 text-[10px] bg-[#EAF0E6] text-[#4C6444] rounded-md font-medium">
                  ☁️ 백엔드 연동 중
                </span>
              ) : (
                <span className="inline-block px-1.5 py-0.5 text-[10px] bg-[#FDF3EE] text-[#D48C70] rounded-md font-medium">
                  🔒 보관되지 않는 임시방
                </span>
              )}
            </h2>
            <p className="text-xs text-[#7A746A]">비난과 판단 없이 오직 어머님의 마음을 지킵니다</p>
          </div>
        </div>
        <button
          id="clear_chat_button"
          onClick={clearHistory}
          className="text-xs text-[#9E978C] hover:text-[#D48C70] transition-colors flex items-center gap-1 px-2.5 py-1.5 hover:bg-[#F5F2EC] rounded-xl cursor-pointer"
          title="대화 초기화"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">정화하기(초기화)</span>
        </button>
      </div>

      {/* Guest Mode Banner */}
      {!user && (
        <div className="bg-[#FFF5F0] border-b border-[#FBE3D6] px-4 py-2.5 flex items-center gap-2 text-xs text-[#9E4A2A] justify-center text-center">
          <ShieldAlert className="w-4 h-4 text-[#D48C70]" />
          <span><b>구글 로그인</b>을 진행하시면 대화 내역이 백엔드 클라우드에 영구 백업되어 기기가 바뀌어도 유지됩니다.</span>
        </div>
      )}

      {/* Chat Bubble Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FCFAF7] space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isModel = msg.role === "model";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 max-w-[85%] ${isModel ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar icon */}
                {isModel ? (
                  <div className="w-8 h-8 rounded-full bg-[#Eaf0e6] flex-shrink-0 flex items-center justify-center text-[#4C6444] font-semibold text-xs border border-[#C6D4C1]">
                    도
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#FDF3EE] flex-shrink-0 flex items-center justify-center text-[#D48C70] font-semibold text-xs border border-[#F4DDD3]">
                    엄
                  </div>
                )}

                <div className="flex flex-col space-y-1">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-[0_2px_4px_rgba(200,190,180,0.1)] ${
                      isModel
                        ? "bg-[#EAF0E6] text-gray-800 rounded-tl-none border border-[#DEE7DA]"
                        : "bg-[#FDF3EE] text-gray-800 rounded-tr-none border border-[#F4DDD3]"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[10px] text-[#A69E93] ${isModel ? "text-left" : "text-right"}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="w-8 h-8 rounded-full bg-[#Eaf0e6] flex-shrink-0 flex items-center justify-center text-[#4C6444] font-semibold text-xs animate-pulse">
              도
            </div>
            <div className="bg-[#EAF0E6] px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-[#5C6E56] border border-[#DEE7DA]">
              <span className="w-1.5 h-1.5 bg-[#4C6444] rounded-full animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 bg-[#4C6444] rounded-full animate-bounce delay-200"></span>
              <span className="w-1.5 h-1.5 bg-[#4C6444] rounded-full animate-bounce delay-300"></span>
              <span>도담 선생님이 마음의 귀를 기울이고 펜을 고르고 있어요...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Presets */}
      {messages.length === 1 && (
        <div className="px-6 py-3 bg-[#FAF8F5] border-t border-[#EBE6DD] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
          {SUGGESTIONS.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleSend(preset)}
              className="inline-block text-xs text-stone-600 bg-white border border-[#E1DBCE] hover:border-[#4C6444] hover:text-[#4C6444] rounded-full px-3 py-1.5 transition-all shadow-sm cursor-pointer whitespace-normal text-left max-w-[280px]"
            >
              🌱 {preset}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 border-t border-[#EBE6DD] bg-white flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="가슴속 맺힌 이야기, 오늘 하루 아들과 있었던 슬픈 마찰 등 무엇이든 편하게 적어보세요..."
          className="flex-1 px-4 py-3 text-sm bg-[#FCFAF7] border border-[#E6DEC9] rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#4C6444] focus:border-[#4C6444] text-gray-800 placeholder-[#ADA497]"
          disabled={loading}
        />
        <button
          id="send_message_button"
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 rounded-2xl bg-[#4C6444] text-white hover:bg-[#3B4D35] disabled:bg-[#CDC4B6] disabled:text-stone-300 transition-all flex items-center justify-center cursor-pointer shadow-md shadow-gray-100"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
