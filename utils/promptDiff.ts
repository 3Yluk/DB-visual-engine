/**
 * [INPUT]: 两个字符串文本
 * [OUTPUT]: 差异分析结果，包含添加/删除/不变的部分
 * [POS]: Utility for prompt diff analysis
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface DiffSegment {
    type: 'added' | 'removed' | 'unchanged';
    text: string;
}

/**
 * Simple word-level diff algorithm
 * Compares two texts and returns segments with diff type
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
    const oldWords = tokenize(oldText);
    const newWords = tokenize(newText);

    // Use LCS (Longest Common Subsequence) based diff
    const lcs = computeLCS(oldWords, newWords);

    const result: DiffSegment[] = [];
    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;

    while (oldIdx < oldWords.length || newIdx < newWords.length) {
        if (lcsIdx < lcs.length && oldIdx < oldWords.length && oldWords[oldIdx] === lcs[lcsIdx]) {
            // This word is in LCS - check if new also matches
            if (newIdx < newWords.length && newWords[newIdx] === lcs[lcsIdx]) {
                // Unchanged
                result.push({ type: 'unchanged', text: oldWords[oldIdx] });
                oldIdx++;
                newIdx++;
                lcsIdx++;
            } else {
                // New word was added
                result.push({ type: 'added', text: newWords[newIdx] });
                newIdx++;
            }
        } else if (lcsIdx < lcs.length && newIdx < newWords.length && newWords[newIdx] === lcs[lcsIdx]) {
            // Old word was removed
            result.push({ type: 'removed', text: oldWords[oldIdx] });
            oldIdx++;
        } else if (oldIdx < oldWords.length && newIdx < newWords.length) {
            // Both differ from LCS
            result.push({ type: 'removed', text: oldWords[oldIdx] });
            result.push({ type: 'added', text: newWords[newIdx] });
            oldIdx++;
            newIdx++;
        } else if (oldIdx < oldWords.length) {
            // Remaining old words are removed
            result.push({ type: 'removed', text: oldWords[oldIdx] });
            oldIdx++;
        } else if (newIdx < newWords.length) {
            // Remaining new words are added
            result.push({ type: 'added', text: newWords[newIdx] });
            newIdx++;
        }
    }

    // Merge consecutive segments of same type
    return mergeSegments(result);
}

/**
 * Tokenize text into words while preserving spaces and punctuation
 */
function tokenize(text: string): string[] {
    // Split by word boundaries but keep delimiters
    return text.split(/(\s+|[，。！？、：；""''（）【】《》\n])/g).filter(s => s.length > 0);
}

/**
 * Compute Longest Common Subsequence
 */
function computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;

    // DP table
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

/**
 * Merge consecutive segments of the same type
 */
function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
    if (segments.length === 0) return [];

    const merged: DiffSegment[] = [segments[0]];

    for (let i = 1; i < segments.length; i++) {
        const last = merged[merged.length - 1];
        const current = segments[i];

        if (last.type === current.type) {
            last.text += current.text;
        } else {
            merged.push(current);
        }
    }

    return merged;
}

/**
 * Check if two prompts have meaningful differences
 */
export function hasSignificantDiff(oldText: string, newText: string): boolean {
    if (!oldText || !newText) return false;
    if (oldText.trim() === newText.trim()) return false;

    const diff = computeWordDiff(oldText, newText);
    const changedSegments = diff.filter(s => s.type !== 'unchanged');

    // Consider it significant if there's at least one change that's not just whitespace
    return changedSegments.some(s => s.text.trim().length > 0);
}
