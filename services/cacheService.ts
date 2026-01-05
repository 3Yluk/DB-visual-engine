// Local cache service for persisting current task state

import { AppState, AgentRole, AnalysisResult } from '../types';

const CACHE_KEY = 'unimage_current_task';

export interface CachedTaskState {
  image: string | null;
  mimeType: string;
  displayImage: string | null;
  detectedAspectRatio: string;
  videoAnalysisDuration: number | null;
  results: Record<AgentRole, AnalysisResult>;
  editablePrompt: string;
  generatedImage: string | null;
  generatedImages: string[];
  layoutData: AppState['layoutData'];
  promptCache: AppState['promptCache'];
  selectedHistoryIndex: number;
  timestamp: number;
}

const EMPTY_RESULTS: Record<AgentRole, AnalysisResult> = {
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
export const saveCurrentTask = (state: Partial<CachedTaskState>): void => {
  try {
    const cached: CachedTaskState = {
      image: state.image ?? null,
      mimeType: state.mimeType ?? '',
      displayImage: state.displayImage ?? null,
      detectedAspectRatio: state.detectedAspectRatio ?? '1:1',
      videoAnalysisDuration: state.videoAnalysisDuration ?? null,
      results: state.results ?? EMPTY_RESULTS,
      editablePrompt: state.editablePrompt ?? '',
      generatedImage: state.generatedImage ?? null,
      generatedImages: state.generatedImages ?? [],
      layoutData: state.layoutData ?? null,
      promptCache: state.promptCache ?? { CN: '', EN: '' },
      selectedHistoryIndex: state.selectedHistoryIndex ?? 0,
      timestamp: Date.now()
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to save task cache:', e);
  }
};

/**
 * Load current task state from localStorage
 */
export const loadCurrentTask = (): CachedTaskState | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedTaskState;
    
    // Optional: Check if cache is too old (e.g., > 7 days)
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - parsed.timestamp > MAX_AGE) {
      clearCurrentTask();
      return null;
    }
    
    return parsed;
  } catch (e) {
    console.warn('Failed to load task cache:', e);
    return null;
  }
};

/**
 * Clear current task cache
 */
export const clearCurrentTask = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear task cache:', e);
  }
};
