
import React from 'react';
import { AgentConfig, AnalysisResult } from '../types';
import { Icons } from './Icons';

interface AgentCardProps {
  config: AgentConfig;
  result: AnalysisResult | undefined;
  isActive: boolean;
  isPending: boolean;
  onRegenerate?: () => void;
  onContentChange?: (content: string) => void;
  onCopy?: () => void;
  onStartPipeline?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ config, result, isActive, isPending, onRegenerate, onContentChange, onCopy, onStartPipeline }) => {
  const isComplete = result?.isComplete;
  const content = result?.content || '';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100 flex-shrink-0">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-800">{config.name}</h2>
          <p className="text-[10px] text-stone-400 font-medium tracking-wide uppercase mt-0.5">{config.description}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Regenerate Button */}
          {onRegenerate && !isActive && (
            <button
              onClick={onRegenerate}
              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-all"
              title="重新生成"
            >
              <Icons.RefreshCw size={12} />
            </button>
          )}

          {/* Copy Button */}
          {content && (
            <button
              onClick={onCopy || (() => { navigator.clipboard.writeText(content); })}
              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-all"
              title="复制"
            >
              <Icons.CheckSquare size={12} />
            </button>
          )}

          {/* Status Indicators */}
          {isComplete && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
              <Icons.CheckCircle2 size={12} /> 已完成
            </div>
          )}
          {isActive && !isComplete && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-bold">
              <Icons.RefreshCw className="animate-spin" size={12} />
              分析中
            </div>
          )}
        </div>
      </div>

      {/* Editable Content */}
      <div className="flex-1 min-h-0 pt-4 relative">
        {content ? (
          <textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            className="absolute left-0 right-0 bottom-0 top-4 bg-stone-50 rounded-xl border border-stone-200 p-4 pb-20 text-[12px] font-mono leading-relaxed focus:ring-2 focus:ring-black/10 outline-none resize-none overflow-y-auto custom-scrollbar"
            placeholder="等待分析结果..."
            spellCheck={false}
          />
        ) : (
          <div className="absolute inset-0 top-4 flex flex-col items-center justify-center text-stone-300 space-y-4">
            {isActive ? (
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            ) : (
              <>
                <Icons.Clock size={32} strokeWidth={1} />
                <p className="text-sm italic">等待流水线信号...</p>
                {onStartPipeline && (
                  <button
                    onClick={onStartPipeline}
                    className="mt-4 px-6 py-2.5 bg-black text-white rounded-full text-xs font-bold hover:bg-stone-800 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
                  >
                    <Icons.Play size={14} /> 启动深度扫描
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
