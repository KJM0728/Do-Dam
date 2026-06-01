import React, { useState, useEffect, useRef } from "react";
import { Play, Square, RefreshCw, Volume2, VolumeX, Eye, Info, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Simple procedural synthesizer to avoid external audio dependency crashes.
// Generates soft sinus wave or ocean wave like white noise if possible, but keeping it light and failure-safe.
class BreathingAudio {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying: boolean = false;

  start() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = "sine";
      // Natural hum of sound - 432Hz is known as a healing frequency
      this.osc.frequency.setValueAtTime(432, this.ctx.currentTime);
      
      this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.isPlaying = true;
    } catch (e) {
      console.error(e);
    }
  }

  // Smoothly guide gain up during inhalation and down during exhalation
  adjustVolume(target: number, duration: number) {
    if (!this.ctx || !this.gain || !this.isPlaying) return;
    try {
      this.gain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + duration);
    } catch (e) {
      // safe fallback
    }
  }

  stop() {
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {
      // safe fallback
    }
    this.osc = null;
    this.ctx = null;
    this.gain = null;
    this.isPlaying = false;
  }
}

export default function BreathingMeditation() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "idle">("idle");
  const [counter, setCounter] = useState(4);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [inhaleCount, setInhaleCount] = useState(0);
  const audioRef = useRef<BreathingAudio | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.stop();
    };
  }, []);

  const handleToggle = () => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  const startSession = () => {
    setIsActive(true);
    setPhase("inhale");
    setCounter(4);
    setInhaleCount(0);
    
    if (soundEnabled) {
      audioRef.current = new BreathingAudio();
      audioRef.current.start();
      audioRef.current.adjustVolume(0.15, 4); // Soft hum up
    }

    runBreathingCycle("inhale", 4);
  };

  const stopSession = () => {
    setIsActive(false);
    setPhase("idle");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current = null;
    }
  };

  const runBreathingCycle = (currentPhase: "inhale" | "hold" | "exhale", duration: number) => {
    setPhase(currentPhase);
    setCounter(duration);

    if (timerRef.current) clearInterval(timerRef.current);

    let timeLeft = duration;
    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setCounter(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;

        // Transition logic
        if (currentPhase === "inhale") {
          // Inhale complete -> hold breath
          if (soundEnabled && audioRef.current) {
            audioRef.current.adjustVolume(0.08, 1);
          }
          runBreathingCycle("hold", 4);
        } else if (currentPhase === "hold") {
          // Hold complete -> exhale
          if (soundEnabled && audioRef.current) {
            audioRef.current.adjustVolume(0.01, 4);
          }
          runBreathingCycle("exhale", 4);
        } else {
          // Exhale complete -> inhale
          setInhaleCount((prev) => prev + 1);
          if (soundEnabled && audioRef.current) {
            audioRef.current.adjustVolume(0.15, 4);
          }
          runBreathingCycle("inhale", 4);
        }
      }
    }, 1000);
  };

  // Toggle sound setting
  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (isActive) {
      if (nextVal) {
        audioRef.current = new BreathingAudio();
        audioRef.current.start();
        if (phase === "inhale") {
          audioRef.current.adjustVolume(0.15, counter);
        } else if (phase === "hold") {
          audioRef.current.adjustVolume(0.08, counter);
        } else {
          audioRef.current.adjustVolume(0.01, counter);
        }
      } else {
        if (audioRef.current) {
          audioRef.current.stop();
          audioRef.current = null;
        }
      }
    }
  };

  // Compute textual guidelines and colors based on phase
  const getPhaseInfo = () => {
    switch (phase) {
      case "inhale":
        return {
          title: "들이쉬기 (Inhale)",
          instruction: "코를 통해 맑고 온화한 에너지를 가득 채웁니다.",
          bg: "bg-[#EAF0E6]",
          textColor: "text-[#4C6444]",
          scale: 1.4,
          radialColor: "from-[#4C6444]/20 to-[#EAF0E6]/10"
        };
      case "hold":
        return {
          title: "머금기 (Hold)",
          instruction: "나를 괴롭히던 죄책감과 염려가 서서히 녹고 있습니다.",
          bg: "bg-[#F3EFE9]",
          textColor: "text-stone-700",
          scale: 1.4,
          radialColor: "from-stone-600/10 to-stone-200/5"
        };
      case "exhale":
        return {
          title: "내쉬기 (Exhale)",
          instruction: "아들에 대한 원망, 어제의 분노를 입을 통해 씻어냅니다.",
          bg: "bg-[#FDF3EE]",
          textColor: "text-[#D48C70]",
          scale: 1.0,
          radialColor: "from-[#D48C70]/10 to-[#FDF3EE]/5"
        };
      default:
        return {
          title: "정열 명상 준비",
          instruction: "숨을 한 번 크게 쉬고, 시작 버튼을 눌러 피로를 흐트러뜨려 보세요.",
          bg: "bg-stone-50",
          textColor: "text-stone-400",
          scale: 1.0,
          radialColor: "from-[#4C6444]/5 to-transparent"
        };
    }
  };

  const currentInfo = getPhaseInfo();

  return (
    <div id="breathing_meditation_container" className="bg-white border border-[#EBE6DD] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex items-center justify-between border-b border-[#F2EFE8] pb-3">
          <div className="text-left">
            <h3 className="font-sans font-bold text-gray-800 text-base md:text-lg flex items-center gap-1.5">
              <span>🌸</span> 엄마의 10분 심호흡 구명정
            </h3>
            <p className="text-xs text-[#7A746A]">화가 솟구치거나 슬픔이 밀려올 때, 온전한 4초 순환</p>
          </div>

          <button
            id="toggle_sound_meditation"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? "bg-[#EAF0E6] border-[#4C6444]/30 text-[#4C6444]"
                : "bg-stone-50 border-[#EBE6DD] text-stone-400 hover:text-stone-600"
            }`}
            title={soundEnabled ? "치유 주파수 음소거" : "치유 주파수 켜기"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Breathing Animation Arena */}
        <div className="py-8 flex flex-col items-center justify-center relative min-h-[300px]">
          {/* Subtle glowing ring background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-80 h-80 rounded-full bg-gradient-to-tr ${currentInfo.radialColor} blur-2xl transition-all duration-1000`} />
          </div>

          {/* Interactive animated circle */}
          <motion.div
            animate={{
              scale: currentInfo.scale,
              backgroundColor: phase === "inhale" ? "#EAF0E6" : phase === "hold" ? "#FAF5EF" : "#FDF3EE"
            }}
            transition={{
              duration: phase === "hold" ? 0.3 : 3.8,
              ease: "easeInOut"
            }}
            className="w-40 h-40 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-[#C5BFA7] relative shadow-inner z-10"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={counter + "-" + phase}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                {isActive ? (
                  <>
                    <span className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-gray-800">
                      {counter}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold uppercase mt-1 tracking-wider">
                      {phase === "inhale" ? "숨마시기" : phase === "hold" ? "참기" : "내쉬기"}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center select-none text-[#D48C70]">
                    <Sparkles className="w-8 h-8 animate-pulse mb-1.5" />
                    <span className="text-xs font-bold text-[#8C8370]">쉼 호흡</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Instruction text displaying phase details */}
          <div className="mt-8 space-y-1 z-10 text-center max-w-sm">
            <h4 className={`font-sans font-bold text-sm ${currentInfo.textColor} h-6 transition-all duration-300`}>
              {isActive ? currentInfo.title : "조용히 눈을 감고 편히 앉으세요"}
            </h4>
            <p className="text-xs text-stone-600 px-4 leading-relaxed min-h-[40px]">
              {currentInfo.instruction}
            </p>
          </div>
        </div>

        {/* Counter and stats */}
        <div className="flex items-center justify-around bg-[#FCFAF7] border border-[#F2EFE8] rounded-2xl py-3 px-4 text-xs">
          <div>
            <p className="text-stone-400 font-medium">호흡 완료 횟수</p>
            <p className="text-gray-800 font-bold font-mono mt-0.5 text-base text-[#4C6444]">
              {inhaleCount} 회
            </p>
          </div>
          <div className="h-6 w-px bg-[#EBE6DD]"></div>
          <div>
            <p className="text-stone-400 font-medium">안도 지수 회복</p>
            <p className="text-gray-800 font-bold mt-0.5 text-base text-[#D48C70]">
              {(inhaleCount * 5).toLocaleString()}%
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          <button
            id="start_resonance_breathing"
            onClick={handleToggle}
            className={`flex-1 py-3 px-4 font-semibold text-xs rounded-2xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isActive
                ? "bg-red-50 hover:bg-red-100/50 border-red-200 text-red-600"
                : "bg-[#4C6444] hover:bg-[#3E5137] text-white border-transparent shadow shadow-green-100"
            }`}
          >
            {isActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>명상 멈추기</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>의식 호흡 시작하기</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-stone-55 rounded-2xl p-4 flex gap-2.5 text-stone-500 bg-[#FAF8F5] text-[11px] text-left">
          <Info className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            ADHD 자녀를 양육하는 것은 극도의 정신적 에너지를 요구합니다. 화가 갑자기 차오르거나, 아이와 싸운 직후에는 꼭 <b>'의식 호흡'</b>을 단 1분만이라도 수행해 뇌의 자율신경계를 리셋해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
