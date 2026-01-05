
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { AGENTS, SINGLE_STEP_REVERSE_PROMPT } from '../constants';
import { AgentRole } from '../types';
import { promptManager, PromptVersion, REVERSE_SKILL_ID } from '../services/promptManager';

interface PromptLabModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ROLES = [
    ...Object.values(AgentRole).filter(r => r !== AgentRole.SORA_VIDEOGRAPHER)
];

const getRoleName = (role: string) => {
    return AGENTS[role as AgentRole]?.name.split('(')[0].trim() || role;
};

export const PromptLabModal: React.FC<PromptLabModalProps> = ({ isOpen, onClose }) => {
    const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set([AgentRole.SYNTHESIZER]));
    const [currentSelection, setCurrentSelection] = useState<{ role: string; versionId: string } | null>(null);
    const [allVersions, setAllVersions] = useState<Record<string, PromptVersion[]>>({});
    const [activeVersions, setActiveVersions] = useState<Record<string, string | null>>({});
    const [editorContent, setEditorContent] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameText, setRenameText] = useState("");

    // Load all versions on open
    useEffect(() => {
        if (!isOpen) return;
        loadAllVersions();
    }, [isOpen]);

    // Handle ESC key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const loadAllVersions = () => {
        const allVers: Record<string, PromptVersion[]> = {};
        const actives: Record<string, string | null> = {};

        ROLES.forEach(role => {
            let libs = promptManager.getVersions(role);
            const activeId = promptManager.getActiveVersionId(role);

            if (libs.length === 0) {
                // Initialize defaults
                const defaults: PromptVersion[] = [];
                defaults.push({
                    id: Date.now().toString(),
                    name: role === AgentRole.SYNTHESIZER ? "Standard Mode" : "Default",
                    content: AGENTS[role as AgentRole]?.systemInstruction || "",
                    updatedAt: Date.now()
                });

                if (role === AgentRole.SYNTHESIZER) {
                    defaults.push({
                        id: (Date.now() + 1).toString(),
                        name: "Reverse Mode",
                        content: SINGLE_STEP_REVERSE_PROMPT,
                        updatedAt: Date.now()
                    });
                }

                defaults.forEach(v => promptManager.saveVersion(role, v));
                promptManager.setActiveVersionId(role, defaults[0].id);
                libs = defaults;
                actives[role] = defaults[0].id;
            } else {
                actives[role] = activeId;
            }

            allVers[role] = libs;
        });

        setAllVersions(allVers);
        setActiveVersions(actives);

        // Auto-select first active version if nothing selected
        if (!currentSelection) {
            const synth = allVers[AgentRole.SYNTHESIZER];
            if (synth && synth.length > 0) {
                const activeId = actives[AgentRole.SYNTHESIZER] || synth[0].id;
                setCurrentSelection({ role: AgentRole.SYNTHESIZER, versionId: activeId });
                setEditorContent(synth.find(v => v.id === activeId)?.content || "");
            }
        }
    };

    const toggleRole = (role: string) => {
        setExpandedRoles(prev => {
            const next = new Set(prev);
            if (next.has(role)) next.delete(role);
            else next.add(role);
            return next;
        });
    };

    const selectVersion = (role: string, versionId: string) => {
        setCurrentSelection({ role, versionId });
        const ver = allVersions[role]?.find(v => v.id === versionId);
        setEditorContent(ver?.content || "");
        setIsRenaming(false);
    };

    const handleSave = () => {
        if (!currentSelection) return;
        const { role, versionId } = currentSelection;
        const ver = allVersions[role]?.find(v => v.id === versionId);
        if (!ver) return;

        const updated = { ...ver, content: editorContent, updatedAt: Date.now() };
        promptManager.saveVersion(role, updated);
        loadAllVersions();
    };

    const handleActivate = () => {
        if (!currentSelection) return;
        const { role, versionId } = currentSelection;
        promptManager.setActiveVersionId(role, versionId);
        setActiveVersions(prev => ({ ...prev, [role]: versionId }));
    };

    const handleCreate = () => {
        if (!currentSelection) return;
        const { role, versionId } = currentSelection;
        const ver = allVersions[role]?.find(v => v.id === versionId);

        const newVer: PromptVersion = {
            id: Date.now().toString(),
            name: `${ver?.name || 'Version'} Copy`,
            content: editorContent,
            updatedAt: Date.now()
        };
        promptManager.saveVersion(role, newVer);
        loadAllVersions();
        setCurrentSelection({ role, versionId: newVer.id });
    };

    const handleDelete = () => {
        if (!currentSelection) return;
        const { role, versionId } = currentSelection;
        if ((allVersions[role]?.length || 0) <= 1) return;

        promptManager.deleteVersion(role, versionId);

        if (activeVersions[role] === versionId) {
            const remaining = promptManager.getVersions(role);
            if (remaining.length > 0) {
                promptManager.setActiveVersionId(role, remaining[0].id);
            }
        }

        loadAllVersions();
        setCurrentSelection(null);
    };

    const handleRename = () => {
        if (!currentSelection) return;
        const { role, versionId } = currentSelection;
        const ver = allVersions[role]?.find(v => v.id === versionId);
        if (ver) {
            promptManager.saveVersion(role, { ...ver, name: renameText });
            setIsRenaming(false);
            loadAllVersions();
        }
    };

    if (!isOpen) return null;

    const currentVersion = currentSelection
        ? allVersions[currentSelection.role]?.find(v => v.id === currentSelection.versionId)
        : null;
    const hasUnsavedChanges = currentVersion && currentVersion.content !== editorContent;
    const isActive = currentSelection && activeVersions[currentSelection.role] === currentSelection.versionId;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden border border-stone-700 flex"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Sidebar: Tree View */}
                <div className="w-64 bg-stone-950 border-r border-stone-800 flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-stone-800 font-bold text-stone-500 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Icons.Cpu size={14} /> Prompt Templates
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                        {ROLES.map(role => (
                            <div key={role} className="mb-1">
                                {/* Role Header */}
                                <button
                                    onClick={() => toggleRole(role)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-stone-400 hover:bg-stone-800 rounded-lg transition-all"
                                >
                                    <span className={`transition-transform ${expandedRoles.has(role) ? 'rotate-90' : ''}`}>
                                        <Icons.ChevronRight size={12} />
                                    </span>
                                    {getRoleName(role)}
                                    <span className="ml-auto text-[10px] text-stone-600 font-normal">
                                        {allVersions[role]?.length || 0}
                                    </span>
                                </button>

                                {/* Version List */}
                                {expandedRoles.has(role) && (
                                    <div className="ml-4 pl-2 border-l border-stone-700">
                                        {allVersions[role]?.map(ver => {
                                            const isSelected = currentSelection?.role === role && currentSelection?.versionId === ver.id;
                                            const isActiveVer = activeVersions[role] === ver.id;
                                            return (
                                                <button
                                                    key={ver.id}
                                                    onClick={() => selectVersion(role, ver.id)}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg mb-0.5 flex items-center gap-2 transition-all ${isSelected
                                                        ? 'bg-orange-600 text-white'
                                                        : 'text-stone-500 hover:bg-stone-800'
                                                        }`}
                                                >
                                                    {isActiveVer && (
                                                        <Icons.Check size={10} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                                                    )}
                                                    <span className="truncate flex-1">{ver.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-3 border-b border-stone-800 bg-stone-900 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            {currentVersion && (
                                <>
                                    {isRenaming ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                value={renameText}
                                                onChange={e => setRenameText(e.target.value)}
                                                className="text-sm border border-stone-600 bg-stone-800 text-stone-200 rounded px-2 py-1 w-48 outline-none focus:border-orange-500"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleRename()}
                                            />
                                            <button onClick={handleRename} className="p-1 hover:bg-emerald-900/30 rounded text-emerald-500"><Icons.Check size={14} /></button>
                                            <button onClick={() => setIsRenaming(false)} className="p-1 hover:bg-rose-900/30 rounded text-rose-500"><Icons.X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-stone-200">{currentVersion.name}</span>
                                            <button
                                                onClick={() => { setRenameText(currentVersion.name); setIsRenaming(true); }}
                                                className="p-1 text-stone-500 hover:text-stone-200 rounded hover:bg-stone-800"
                                            >
                                                <Icons.Edit2 size={12} />
                                            </button>
                                            {isActive && (
                                                <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded text-[10px] font-bold">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleCreate} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                <Icons.Copy size={12} /> Duplicate
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={!currentSelection || (allVersions[currentSelection.role]?.length || 0) <= 1}
                                className="p-1.5 hover:bg-rose-900/30 text-stone-500 hover:text-rose-500 rounded-lg disabled:opacity-30"
                            >
                                <Icons.Trash2 size={14} />
                            </button>

                            <div className="w-px h-4 bg-stone-700 mx-1" />

                            {isActive ? (
                                <span className="px-3 py-1.5 bg-emerald-900/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                    <Icons.CheckCircle size={12} /> Active
                                </span>
                            ) : (
                                <button
                                    onClick={handleActivate}
                                    disabled={!currentSelection}
                                    className="px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-500 rounded-lg text-xs font-bold disabled:opacity-30"
                                >
                                    Set Active
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="flex-1 min-h-0 p-4 bg-stone-950/50 flex flex-col">
                        {currentVersion ? (
                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                className="flex-1 w-full p-6 bg-stone-900 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 resize-none focus:ring-2 focus:ring-orange-500/30 outline-none custom-scrollbar leading-relaxed placeholder:text-stone-600"
                                placeholder="System prompt content..."
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-600 text-sm">
                                Select a version from the sidebar to edit
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-stone-800 bg-stone-900 flex justify-between items-center">
                        <div className="text-[10px] text-stone-600">
                            {currentVersion && `Updated: ${new Date(currentVersion.updatedAt).toLocaleString()}`}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-800 rounded-lg transition-colors">
                                Close
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                                className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${hasUnsavedChanges
                                    ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-xl'
                                    : 'bg-stone-800 text-stone-500'
                                    }`}
                            >
                                <Icons.Save size={14} />
                                {hasUnsavedChanges ? "Save Changes" : "Saved"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
