
import { AgentRole } from '../types';

export interface PromptVersion {
    id: string;
    name: string;
    content: string;
    updatedAt: number;
}

export type PromptLibrary = Record<string, PromptVersion[]>;

const STORAGE_KEY = 'unimage_prompt_versions';
const ACTIVE_KEY_PREFIX = 'unimage_active_version_';

// Virtual role for Reverse Engineering skill
export const REVERSE_SKILL_ID = 'REVERSE_SKILL';

export const promptManager = {
    getLibrary: (): PromptLibrary => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    },

    saveLibrary: (lib: PromptLibrary) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    },

    getVersions: (roleId: string): PromptVersion[] => {
        const lib = promptManager.getLibrary();
        return lib[roleId] || [];
    },

    saveVersion: (roleId: string, version: PromptVersion) => {
        const lib = promptManager.getLibrary();
        if (!lib[roleId]) lib[roleId] = [];

        const idx = lib[roleId].findIndex(v => v.id === version.id);
        if (idx >= 0) {
            lib[roleId][idx] = version;
        } else {
            lib[roleId].push(version);
        }
        promptManager.saveLibrary(lib);
    },

    deleteVersion: (roleId: string, versionId: string) => {
        const lib = promptManager.getLibrary();
        if (lib[roleId]) {
            lib[roleId] = lib[roleId].filter(v => v.id !== versionId);
            promptManager.saveLibrary(lib);
        }
    },

    getActiveVersionId: (roleId: string): string | null => {
        return localStorage.getItem(ACTIVE_KEY_PREFIX + roleId);
    },

    setActiveVersionId: (roleId: string, versionId: string | null) => {
        if (versionId) {
            localStorage.setItem(ACTIVE_KEY_PREFIX + roleId, versionId);
        } else {
            localStorage.removeItem(ACTIVE_KEY_PREFIX + roleId);
        }
    },

    getActivePromptContent: (roleId: string, defaultContent: string): string => {
        const activeId = promptManager.getActiveVersionId(roleId);
        if (!activeId) return defaultContent;

        const versions = promptManager.getVersions(roleId);
        const version = versions.find(v => v.id === activeId);
        return version ? version.content : defaultContent;
    }
};
