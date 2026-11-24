import React, { useState, useEffect, useRef } from 'react';
import { useMarketStore } from '../store/marketStore.js';

export const ReplayToolbar: React.FC = () => {
  const { replayMode, setReplayMode } = useMarketStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => prev + 1);
      }, 1000 / speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed]);

  if (!replayMode) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e222d] border border-[#2a2e39] shadow-2xl rounded-lg px-4 py-2 flex items-center space-x-3 text-xs text-[#d1d4dc]">
      <span className="font-bold text-[#f59e0b] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
        BAR REPLAY
      </span>

      <span className="text-[#787b86] font-mono">Step: {currentStep}</span>

      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`px-3 py-1 rounded font-bold transition-colors ${
          isPlaying ? 'bg-[#ef5350] text-white' : 'bg-[#26a69a] text-white hover:bg-[#208b81]'
        }`}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <button
        onClick={() => setCurrentStep((p) => p + 1)}
        className="px-2.5 py-1 bg-[#2a2e39] hover:bg-[#363a45] rounded font-semibold text-white transition-colors"
      >
        Step +1
      </button>

      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white font-mono outline-none"
      >
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={5}>5x</option>
        <option value={10}>10x</option>
      </select>

      <button
        onClick={() => {
          setIsPlaying(false);
          setReplayMode(false);
        }}
        className="text-[#787b86] hover:text-[#ef5350] transition-colors ml-2 font-bold"
      >
        Exit
      </button>
    </div>
  );
};
