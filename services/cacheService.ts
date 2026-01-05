// Local cache service for persisting current task state

import { get, set, del } from 'idb-keyval';
import { AppState, AgentRole } from '../types';

const CACHE_KEY = 'unimage_current_task';

export interface CachedTaskState {
  image: string | null; // base64
  mimeType: string;
  displayImage: string | null; // base64
  detectedAspectRatio: string;
  videoAnalysisDuration: number | null;
  results: Record<AgentRole, any>; // Simplified type
  editablePrompt: string;
  generatedImage: string | null;
  generatedImages: string[];
  layoutData: any | null;
  promptCache: Record<string, string>;
  selectedHistoryIndex: number;
  timestamp: number;
  referenceImages: any[];
}

const EMPTY_RESULTS = {
  [AgentRole.AUDITOR]: { role: AgentRole.AUDITOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.DESCRIPTOR]: { role: AgentRole.DESCRIPTOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.ARCHITECT]: { role: AgentRole.ARCHITECT, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SYNTHESIZER]: { role: AgentRole.SYNTHESIZER, content: '', isStreaming: false, isComplete: false },
  [AgentRole.CRITIC]: { role: AgentRole.CRITIC, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SORA_VIDEOGRAPHER]: { role: AgentRole.SORA_VIDEOGRAPHER, content: '', isStreaming: false, isComplete: false },
};

/**
 * Save current task state to localStorage
 */
export const saveCurrentTask = async (state: Partial<CachedTaskState>): Promise<void> => {
  try {
    const cached: CachedTaskState = {
      image: state.image ?? null,
      mimeType: state.mimeType ?? '',
      displayImage: state.displayImage ?? null,
      detectedAspectRatio: state.detectedAspectRatio ?? "1:1",
      videoAnalysisDuration: state.videoAnalysisDuration ?? null,
      results: state.results ?? EMPTY_RESULTS,
      editablePrompt: state.editablePrompt ?? '',
      generatedImage: state.generatedImage ?? null,
      generatedImages: state.generatedImages ?? [],
      layoutData: state.layoutData ?? null,
      promptCache: state.promptCache ?? { CN: '', EN: '' },
      selectedHistoryIndex: state.selectedHistoryIndex ?? 0,
      timestamp: Date.now(),
      referenceImages: state.referenceImages ?? []
    };

    await set(CACHE_KEY, cached);
  } catch (e) {
    console.error('Failed to save task cache to IndexedDB:', e);
  }
};

/**
 * Load current task state from localStorage
 */
export const loadCurrentTask = async (): Promise<CachedTaskState | null> => {
  try {
    const cached = await get<CachedTaskState>(CACHE_KEY);
    if (!cached) return null;

    // Validate timestamp (expire after 24h)
    if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
      await del(CACHE_KEY);
      return null;
    }

    return cached;
  } catch (e) {
    console.error('Failed to load task cache from IndexedDB:', e);
    return null;
  }
};

/**
 * Clear current task cache
 */
export const clearCurrentTask = async (): Promise<void> => {
  try {
    await del(CACHE_KEY);
  } catch (e) {
    console.error('Failed to clear task cache:', e);
  }
};
