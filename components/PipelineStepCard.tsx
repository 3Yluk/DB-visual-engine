import React, { useState } from 'react';
import { Icons } from './Icons';
import { PipelineStep, PipelineStepStatus } from '../types';
import ReactMarkdown from 'react-markdown';

interface PipelineStepCardProps {
  step: PipelineStep;
  index: number;
}

export const PipelineStepCard: React.FC<PipelineStepCardProps> = ({ step, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (step.status) {
      case PipelineStepStatus.COMPLETED:
        return <Icons.CheckCircle size={16} className="text-green-500" />;
      case PipelineStepStatus.RUNNING:
        return <Icons.RefreshCw size={16} className="text-blue-400 animate-spin" />;
      case PipelineStepStatus.ERROR:
        return <Icons.AlertCircle size={16} className="text-rose-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-stone-600" />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case PipelineStepStatus.COMPLETED:
        return 'border-green-800/50 bg-green-900/20';
      case PipelineStepStatus.RUNNING:
        return 'border-blue-800/50 bg-blue-900/20';
      case PipelineStepStatus.ERROR:
        return 'border-rose-800/50 bg-rose-900/20';
      default:
        return 'border-stone-700 bg-stone-800';
    }
  };

  const content = step.status === PipelineStepStatus.RUNNING
    ? step.streamingContent
    : step.finalContent;

  return (
    <div className={`rounded-xl border-2 transition-all ${getStatusColor()}`}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-200">
                {index + 1}. {step.name.split('(')[0].trim()}
              </h3>
              {step.status === PipelineStepStatus.RUNNING && (
                <span className="text-xs text-blue-400 font-bold">
                  {step.progress}%
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{step.description}</p>
          </div>
        </div>

        {/* Progress Bar for Running Step */}
        {step.status === PipelineStepStatus.RUNNING && (
          <div className="w-24 h-2 bg-blue-900/30 rounded-full overflow-hidden ml-3">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${step.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {content && (
        <div className="px-4 pb-4">
          <div className={`relative ${isExpanded ? '' : 'max-h-20 overflow-hidden'}`}>
            <div className="text-xs text-stone-400 leading-relaxed font-mono bg-stone-900/50 p-3 rounded-lg">
              {step.status === PipelineStepStatus.RUNNING ? (
                // 流式输出 - 带打字效果
                <div className="prose prose-sm max-w-none prose-invert">
                  {content}
                  <span className="inline-block w-1 h-4 bg-blue-400 animate-pulse ml-0.5" />
                </div>
              ) : (
                // 完成后的内容 - 显示文本
                <div className="whitespace-pre-wrap">
                  {content}
                </div>
              )}
            </div>
            {!isExpanded && content.length > 200 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-stone-800 to-transparent" />
            )}
          </div>

          {content.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <Icons.ChevronUp size={12} /> 收起
                </>
              ) : (
                <>
                  <Icons.ChevronDown size={12} /> 查看完整分析
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {step.error && (
        <div className="px-4 pb-4">
          <div className="bg-rose-900/30 border border-rose-800/50 rounded-lg p-3 text-xs text-rose-400">
            <strong>错误：</strong> {step.error}
          </div>
        </div>
      )}
    </div>
  );
};
