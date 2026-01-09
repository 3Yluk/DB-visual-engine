/**
 * [INPUT]: 依赖 AppState, AgentCard, PanelHeader
 * [OUTPUT]: 渲染 AgentWorkbench 组件 (右侧多Agent工作区)
 * [POS]: components/AgentWorkbench, 核心布局右栏, 负责Agent协作展示
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import React from 'react';
import { AgentCard } from './AgentCard';
import { PanelHeader } from './PanelHeader';
import { Icons } from './Icons';
import { AGENTS } from '../constants';
import { AgentRole, AppState, PipelineProgress, TabType } from '../types';
import { useI18n } from '../hooks/useI18n';

interface AgentWorkbenchProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    pipelineProgress: PipelineProgress | null;
    handleRegenerateAgent: (role: AgentRole) => void;
    studioContent: React.ReactNode;
}

export const AgentWorkbench: React.FC<AgentWorkbenchProps> = ({
    activeTab,
    setActiveTab,
    state,
    setState,
    pipelineProgress,
    handleRegenerateAgent,
    studioContent
}) => {
    const { t } = useI18n();

    // Helper to render active tab content
    const renderContent = () => {
        if (activeTab === 'STUDIO') {
            return studioContent;
        }

        // Agent tabs (AUDITOR, DESCRIPTOR, ARCHITECT)
        return (
            <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                <AgentCard
                    config={AGENTS[activeTab as AgentRole]}
                    result={state.results[activeTab as AgentRole]}
                    isActive={state.activeRole === activeTab}
                    isPending={!state.results[activeTab as AgentRole]?.content}
                    onRegenerate={() => handleRegenerateAgent(activeTab as AgentRole)}
                    onContentChange={(content) => setState(prev => ({
                        ...prev,
                        results: { ...prev.results, [activeTab]: { ...prev.results[activeTab as AgentRole], content } }
                    }))}
                    onCopy={() => {
                        const content = state.results[activeTab as AgentRole]?.content;
                        if (content) {
                            navigator.clipboard.writeText(content);
                            // Toast would be nice but we don't have it passed here. 
                            // AgentCard might handle it or we can ignore for now as per 1:1 copy
                        }
                    }}
                />
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 shadow-sm relative min-w-0">
            <PanelHeader title="Workbench" className="rounded-t-xl">
                <div className="flex items-center bg-stone-800 p-0.5 rounded-lg">
                    {['STUDIO', 'AUDITOR', 'DESCRIPTOR', 'ARCHITECT'].filter(tid => {
                        if (tid === 'STUDIO') return true;
                        const roleKey = tid as AgentRole;
                        const hasContent = !!state.results[roleKey]?.content;
                        // Check if this step is currently running
                        const currentStepIndex = pipelineProgress?.currentStepIndex ?? -1;
                        const isCurrentStep = pipelineProgress?.isRunning && pipelineProgress?.steps[currentStepIndex]?.role === roleKey;
                        // Keep visible if active (prevent disappearing) or if data exists
                        return hasContent || isCurrentStep || activeTab === tid;
                    }).map((tid) => {
                        const isStudio = tid === 'STUDIO';
                        const roleKey = isStudio ? AgentRole.SYNTHESIZER : tid as AgentRole;
                        const iconName = isStudio ? 'PenTool' : AGENTS[roleKey]?.icon;
                        const IconComponent = Icons[iconName as keyof typeof Icons];
                        const result = state.results[roleKey];
                        const currentStepIndex = pipelineProgress?.currentStepIndex ?? -1;
                        const isCurrentStep = pipelineProgress?.steps[currentStepIndex]?.role === roleKey && pipelineProgress.isRunning;

                        // Short tab labels
                        const tabLabels: Record<string, string> = {
                            'STUDIO': 'Studio',
                            'AUDITOR': '场景',
                            'DESCRIPTOR': '材质',
                            'ARCHITECT': '构图'
                        };

                        return (
                            <button
                                key={tid}
                                onClick={() => setActiveTab(tid as any)}
                                className={`relative px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${activeTab === tid ? 'bg-stone-600 shadow-sm text-stone-100' : 'text-stone-500 hover:text-stone-300'} animate-in fade-in slide-in-from-left-2 duration-300`}
                            >
                                <div className={isCurrentStep ? 'text-blue-400 animate-pulse' : ''}>
                                    {result?.isStreaming ? <Icons.RefreshCw size={12} className="animate-spin" /> : IconComponent && <IconComponent size={12} />}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-tight">{tabLabels[tid]}</span>
                                {result?.isComplete && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-stone-800" />}
                            </button>
                        );
                    })}
                </div>
            </PanelHeader>

            <div className="flex-1 min-h-0 bg-stone-900 relative rounded-b-xl">
                {!state.image && activeTab !== 'STUDIO' ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-700 space-y-4">
                        <Icons.Compass size={48} strokeWidth={1} className="animate-spin duration-10000 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">{t('chat.uploadImageFirst')}</p>
                    </div>
                ) : renderContent()}
            </div>
        </div>
    );
};
