
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Task, TimerState, Settings } from '../types';
import { Button } from './Button';

interface TimerProps {
  activeTask: Task | undefined;
  settings: Settings;
  onTaskComplete: (taskId: string) => void;
  onPomodoroComplete: (taskId: string) => void;
}

export const Timer: React.FC<TimerProps> = ({ 
  activeTask, 
  settings, 
  onTaskComplete, 
  onPomodoroComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroDuration * 60);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [mode, setMode] = useState<'pomo' | 'short' | 'long'>('pomo');

  // Refs to hold latest state for interval
  const stateRef = useRef({
      timeLeft,
      timerState,
      mode,
      activeTask,
      settings
  });

  useEffect(() => {
      stateRef.current = { timeLeft, timerState, mode, activeTask, settings };
  }, [timeLeft, timerState, mode, activeTask, settings]);

  // Reset timer when active task ID changes
  useEffect(() => {
    if (activeTask) {
      setTimerState(TimerState.IDLE);
      setMode('pomo');
      setTimeLeft(settings.pomodoroDuration * 60);
    }
  }, [activeTask?.id, settings.pomodoroDuration]);

  const handleTimerFinish = useCallback(() => {
    const currentMode = stateRef.current.mode;
    const currentTask = stateRef.current.activeTask;
    const currentSettings = stateRef.current.settings;

    setTimerState(TimerState.IDLE);
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(() => {});

    if (currentMode === 'pomo') {
      if (currentTask) onPomodoroComplete(currentTask.id);
      
      const completed = (currentTask?.completedPomodoros || 0) + 1;
      const nextMode = completed % 4 === 0 ? 'long' : 'short';
      setMode(nextMode);
      setTimeLeft((nextMode === 'long' ? currentSettings.longBreakDuration : currentSettings.shortBreakDuration) * 60);
      
      if (currentSettings.autoStartBreaks) {
        setTimerState(TimerState.RUNNING);
      }
    } else {
      setMode('pomo');
      setTimeLeft(currentSettings.pomodoroDuration * 60);
      if (currentSettings.autoStartPomodoros) {
          setTimerState(TimerState.RUNNING);
      }
    }
  }, [onPomodoroComplete]);

  useEffect(() => {
    const interval = window.setInterval(() => {
        const { timerState, timeLeft } = stateRef.current;
        if (timerState === TimerState.RUNNING) {
            if (timeLeft <= 1) {
                handleTimerFinish();
            } else {
                setTimeLeft(prev => prev - 1);
            }
        }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [handleTimerFinish]);

  const toggleTimer = () => {
    setTimerState(prev => prev === TimerState.RUNNING ? TimerState.PAUSED : TimerState.RUNNING);
  };

  const skipTimer = () => {
    handleTimerFinish();
  };

  const formatTimeDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 p-12">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg">Select a task to start focusing</p>
      </div>
    );
  }

  const durationCurrent = mode === 'pomo' 
      ? settings.pomodoroDuration 
      : (mode === 'short' ? settings.shortBreakDuration : settings.longBreakDuration);
  
  const progress = ((durationCurrent * 60 - timeLeft) / (durationCurrent * 60)) * 100;

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800 relative overflow-hidden w-full h-full min-h-[400px]">
        {/* Progress Background */}
        <div 
            className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
        />

      <div className="text-center space-y-2 mb-8 z-10">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${mode === 'pomo' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {mode === 'pomo' ? 'Focus Time' : mode === 'short' ? 'Short Break' : 'Long Break'}
        </span>
        <h2 className="text-2xl font-bold text-white truncate max-w-md mx-auto">{activeTask.title}</h2>
        <p className="text-slate-400 text-sm">
            {activeTask.completedPomodoros} / {activeTask.expectedPomodoros} Pomodoros
        </p>
      </div>

      <div className="text-8xl lg:text-9xl font-mono font-bold text-slate-100 tracking-tighter mb-10 z-10 tabular-nums">
        {formatTimeDisplay(timeLeft)}
      </div>

      <div className="flex items-center space-x-4 z-10">
        <Button 
            variant={timerState === TimerState.RUNNING ? 'secondary' : 'primary'} 
            size="lg" 
            onClick={toggleTimer}
            className="min-w-[120px]"
        >
          {timerState === TimerState.RUNNING ? 'Pause' : 'Start'}
        </Button>
        
        <Button variant="ghost" onClick={skipTimer} title="Skip current timer">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
           </svg>
        </Button>

        <div className="w-px h-8 bg-slate-700 mx-4"></div>

        <Button variant="success" size="lg" onClick={() => onTaskComplete(activeTask.id)}>
           Complete Task
        </Button>
      </div>
    </div>
  );
};
