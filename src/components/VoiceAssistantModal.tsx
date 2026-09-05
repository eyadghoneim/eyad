import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, VolumeX, Square, Play, Sparkles, X, ShieldCheck, Radio, CheckCircle2 } from 'lucide-react';
import { SupportedAsset, AIReasoning } from '../types';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAsset: SupportedAsset;
  btcPrice: number;
  aiSignal: AIReasoning | null;
  lang: 'ar' | 'en';
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentAsset,
  btcPrice,
  aiSignal,
  lang,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [audioWaves, setAudioWaves] = useState<number[]>([20, 45, 80, 55, 30, 70, 95, 60, 40, 75, 85, 35]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Animate audio waves while playing
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setAudioWaves(
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 75) + 20)
        );
      }, 120);
    } else {
      setAudioWaves([20, 35, 45, 30, 20, 40, 50, 35, 25, 45, 55, 30, 20, 15]);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Construct audio script based on active asset
  const getSpeechScript = () => {
    const assetNameAr = currentAsset === 'BTC' ? 'البيتكوين' : currentAsset === 'ETH' ? 'الإيثريوم' : 'الذهب الرقمي باكس جولد';
    
    if (!aiSignal) {
      return lang === 'ar'
        ? `مرحباً بك في نظام إياد بوت. السعر الحالي لـ ${assetNameAr} هو ${btcPrice.toLocaleString()} دولار. لا توجد إشارة تحليلية بعد، لذلك لا يمكن الإعلان عن أهداف أو نسبة ثقة. شغّل التحليل أولاً.`
        : `Welcome to EYAD Research Bot. Current ${currentAsset} price is ${btcPrice.toLocaleString()} dollars. No analytical signal yet, so no targets or conviction can be announced.`;
    }

    const entry = aiSignal.entryPrice;
    const tp1 = aiSignal.target1;
    const tp2 = aiSignal.target2;
    const sl = aiSignal.stopLoss;
    const score = aiSignal.convictionScore;

    if (lang === 'ar') {
      return `مرحباً بك في نظام إياد بوت للمحاكاة والتحليل. التحليل المباشر لـ ${assetNameAr}. السعر الحالي هو ${btcPrice.toLocaleString()} دولار. حالة الإشارة ${aiSignal.signalType} مع نسبة ثقة ${score} بالمئة. سعر الدخول المعتمد ${entry.toLocaleString()} دولار. الهدف المرجعي الأول عند ${tp1.toLocaleString()} دولار. الهدف الثاني عند ${tp2.toLocaleString()} دولار. مع تطبيق وقف نظري عند ${sl.toLocaleString()} دولار، وتتبع آلي بعد الهدف الأول.`;
    } else {
      return `Welcome to EYAD Research Bot. Live analysis for ${currentAsset}. Current price is ${btcPrice.toLocaleString()} dollars. Signal state is ${aiSignal.signalType} with ${score}% conviction. Entry target at ${entry.toLocaleString()} dollars. Reference target 1 at ${tp1.toLocaleString()} dollars. Stop limit theoretically placed at ${sl.toLocaleString()} dollars with 2% trailing protection.`;
    }
  };

  const handleToggleSpeak = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();
    const textToSpeak = getSpeechScript();
    setCurrentSpeechText(textToSpeak);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Try to pick natural voice if available
    const voices = synthRef.current.getVoices();
    const targetVoice = voices.find((v) =>
      lang === 'ar' ? v.lang.startsWith('ar') : v.lang.startsWith('en')
    );
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    synthRef.current.speak(utterance);
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg bg-[#09090b] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            handleStop();
            onClose();
          }}
          className="absolute top-4 left-4 sm:left-6 p-2 rounded-lg bg-[#18181b] text-gray-400 hover:text-white border border-[#27272a] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-lg">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
              {lang === 'ar' ? 'المساعد الصوتي الذكي (AI Voice Briefing)' : 'AI Voice Research Assistant'}
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              {lang === 'ar'
                ? `ملخص صوتي مباشر وشامل لبيانات ${currentAsset === 'BTC' ? 'البيتكوين' : currentAsset === 'ETH' ? 'الإيثريوم' : 'الذهب'}`
                : `Instant verbal briefing and analysis for ${currentAsset}`}
            </p>
          </div>
        </div>

        {/* Dynamic Voice Visualizer Waveform */}
        <div className="p-6 rounded-xl bg-[#111114] border border-[#222227] flex flex-col items-center justify-center space-y-4">
          <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-xs">
            {audioWaves.map((h, i) => (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-100 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-purple-600 via-amber-400 to-emerald-400 shadow-sm shadow-purple-500/50'
                    : 'bg-[#27272a]'
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          <div className="text-center space-y-1">
            <div className="text-xs font-mono font-bold text-white">
              {isPlaying
                ? (lang === 'ar' ? '🔊 جاري التحدث والشرح الصوتي...' : '🔊 Broadcasting Audio Briefing...')
                : (lang === 'ar' ? 'جاهز للاستماع إلى تقرير السوق' : 'Ready to brief market status')}
            </div>
            <div className="text-[11px] text-gray-400 font-sans max-w-md">
              {getSpeechScript()}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSpeak}
            className={`flex-1 py-3 px-4 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إيقاف الصوت' : 'Stop Audio'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تشغيل الملخص الصوتي الآن' : 'Play Voice Briefing'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="py-3 px-5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-gray-300 font-mono text-xs font-bold border border-[#27272a] transition-all"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
