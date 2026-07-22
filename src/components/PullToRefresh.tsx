import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, ArrowDown, CheckCircle2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  pullText?: string;
  releaseText?: string;
  refreshingText?: string;
  successText?: string;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  pullText = "Tarik ke bawah untuk memperbarui...",
  releaseText = "Lepaskan untuk memperbarui data...",
  refreshingText = "Memperbarui data perizinan...",
  successText = "Data berhasil diperbarui!",
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  const PULL_THRESHOLD = 75; // px needed to trigger refresh
  const MAX_PULL = 120; // max px pull down

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled || isRefreshing) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsDragging(false);
      setPullDistance(0);
      return;
    }

    currentYRef.current = e.touches[0].clientY;
    const distance = currentYRef.current - startYRef.current;

    if (distance > 0) {
      // Damped pull effect
      const dampedDistance = Math.min(MAX_PULL, Math.pow(distance, 0.85) * 2.5);
      setPullDistance(dampedDistance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      await triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Mouse event handlers for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startYRef.current = e.clientY;
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled || isRefreshing) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsDragging(false);
      setPullDistance(0);
      return;
    }

    currentYRef.current = e.clientY;
    const distance = currentYRef.current - startYRef.current;

    if (distance > 0) {
      const dampedDistance = Math.min(MAX_PULL, Math.pow(distance, 0.85) * 2.5);
      setPullDistance(dampedDistance);
    } else {
      setPullDistance(0);
    }
  };

  const handleMouseUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      await triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Manual trigger from button or touch release
  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(60); // lock distance at indicator height during refresh

    try {
      await Promise.resolve(onRefresh());
      setRefreshSuccess(true);
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 600);
    }
  };

  const isReadyToRelease = pullDistance >= PULL_THRESHOLD;

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* Pull indicator bar */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          opacity: Math.min(1, pullDistance / 40),
        }}
      >
        <div className="flex items-center space-x-2.5 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold">
          {refreshSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {successText}
              </span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
              <span className="text-teal-700 dark:text-teal-300 font-medium">
                {refreshingText}
              </span>
            </>
          ) : (
            <>
              <ArrowDown
                className={`w-4 h-4 text-teal-600 dark:text-teal-400 transition-transform duration-200 shrink-0 ${
                  isReadyToRelease ? "rotate-180 text-amber-500" : ""
                }`}
              />
              <span className={isReadyToRelease ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                {isReadyToRelease ? releaseText : pullText}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content with pull touch handlers */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full transition-transform duration-100 ease-out"
        style={{
          transform: isRefreshing ? `translateY(0px)` : `translateY(0px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
