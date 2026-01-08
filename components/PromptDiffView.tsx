/**
 * [INPUT]: 两个提示词文本
 * [OUTPUT]: 差异高亮显示组件
 * [POS]: UI Component for prompt diff visualization
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useMemo } from 'react';
import { computeWordDiff, DiffSegment } from '../utils/promptDiff';

interface PromptDiffViewProps {
    oldPrompt: string;
    newPrompt: string;
    className?: string;
}

export const PromptDiffView: React.FC<PromptDiffViewProps> = ({
    oldPrompt,
    newPrompt,
    className = ''
}) => {
    const diffSegments = useMemo(() => {
        if (!oldPrompt || !newPrompt) return [];
        return computeWordDiff(oldPrompt, newPrompt);
    }, [oldPrompt, newPrompt]);

    if (diffSegments.length === 0) {
        return null;
    }

    return (
        <div className={`text-sm leading-relaxed ${className}`}>
            {diffSegments.map((segment, index) => (
                <DiffSpan key={index} segment={segment} />
            ))}
        </div>
    );
};

const DiffSpan: React.FC<{ segment: DiffSegment }> = ({ segment }) => {
    switch (segment.type) {
        case 'added':
            return (
                <span className="bg-emerald-900/50 text-emerald-300 rounded px-0.5">
                    {segment.text}
                </span>
            );
        case 'removed':
            return (
                <span className="bg-rose-900/50 text-rose-300 line-through rounded px-0.5 opacity-70">
                    {segment.text}
                </span>
            );
        case 'unchanged':
        default:
            return <span className="text-stone-400">{segment.text}</span>;
    }
};

export default PromptDiffView;
