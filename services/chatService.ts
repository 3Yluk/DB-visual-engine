import { ChatMessage, SkillType } from '../types';
import { SINGLE_STEP_REVERSE_PROMPT } from '../constants';
import { refinePromptWithFeedback, streamConsistencyCheck, executeReverseEngineering, ReverseEngineeringResult } from './geminiService';
import { promptManager, REVERSE_SKILL_ID } from './promptManager';

// Generate unique message ID
const genId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Parse user message to detect skill intent
export function detectSkillIntent(message: string): SkillType | null {
    const lowerMsg = message.toLowerCase();

    // Quality check keywords
    if (lowerMsg.includes('质检') || lowerMsg.includes('检查') || lowerMsg.includes('对比') ||
        lowerMsg.includes('compare') || lowerMsg.includes('review')) {
        return 'quality-check';
    }

    // Reverse engineering keywords
    if (lowerMsg.includes('逆向') || lowerMsg.includes('重新分析') || lowerMsg.includes('重新生成提示词') ||
        lowerMsg.includes('reverse')) {
        return 'reverse';
    }

    // Translation keywords
    if (lowerMsg.includes('翻译') || lowerMsg.includes('translate') ||
        lowerMsg.includes('英文') || lowerMsg.includes('中文')) {
        return 'translate';
    }

    // Generate image keywords
    if (lowerMsg.includes('生成') || lowerMsg.includes('出图') || lowerMsg.includes('复刻') ||
        lowerMsg.includes('generate')) {
        return 'generate';
    }

    // Default: treat as refinement request
    return 'refine';
}

// Create a user message
export function createUserMessage(content: string): ChatMessage {
    return {
        id: genId(),
        role: 'user',
        content,
        timestamp: Date.now()
    };
}

// Create an assistant message
export function createAssistantMessage(content: string, isStreaming = false): ChatMessage {
    return {
        id: genId(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        isStreaming
    };
}

// Create a skill result message
export function createSkillResultMessage(
    skillType: SkillType,
    content: string,
    suggestions: string[]
): ChatMessage {
    return {
        id: genId(),
        role: 'skill-result',
        content,
        timestamp: Date.now(),
        skillType,
        suggestions,
        selectedIndices: suggestions.map((_, i) => i), // Select all by default
        applied: false
    };
}

// Execute quality check skill
export async function executeQualityCheck(
    originalImage: string,
    generatedImage: string,
    onStream: (content: string) => void
): Promise<{ content: string; suggestions: string[] }> {
    let fullContent = '';

    const stream = streamConsistencyCheck(originalImage, generatedImage);
    for await (const chunk of stream) {
        fullContent += chunk;
        onStream(fullContent);
    }

    // Parse suggestions from content
    const suggestions = parseSuggestionsFromContent(fullContent);

    return { content: fullContent, suggestions };
}

// Execute refine skill
export async function executeRefineSkill(
    currentPrompt: string,
    userFeedback: string,
    refImage?: string | null,
    mimeType?: string
): Promise<string> {
    return await refinePromptWithFeedback(currentPrompt, userFeedback, refImage, mimeType);
}

// Execute reverse engineering skill
export async function executeReverseSkill(
    originalImage: string,
    mimeType: string
): Promise<{ content: string; suggestions: string[] }> {
    const activePrompt = promptManager.getActivePromptContent(REVERSE_SKILL_ID, SINGLE_STEP_REVERSE_PROMPT);
    const result = await executeReverseEngineering(originalImage, mimeType, activePrompt);

    if (!result) {
        throw new Error("Failed to reverse engineer image");
    }

    // Format content as Markdown
    const analysis = result.image_analysis;
    const content = `
### 🖼️ 图像逆向分析 (Reverse Analysis)

**偏好风格 (Style & Tech):**
${analysis.technical_specs}

**环境氛围 (Environment):**
${analysis.environment}

**光影设定 (Lighting):**
${analysis.lighting}

**色彩方案 (Colors):**
${analysis.colors}

**主体描述 (Subject):**
${analysis.subject}

---
**生成的提示词已准备就绪，点击下方按钮应用。**
`;

    const suggestions = [result.generated_prompt];
    return { content, suggestions };
}

// Parse suggestions from QA content
function parseSuggestionsFromContent(content: string): string[] {
    const markers = ["调优建议", "调优指令", "Optimization Suggestions", "Optimization"];
    let sectionText = "";

    for (const marker of markers) {
        const idx = content.lastIndexOf(marker);
        if (idx !== -1) {
            sectionText = content.slice(idx);
            break;
        }
    }

    if (!sectionText) return [];

    const suggestions: string[] = [];
    const lines = sectionText.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^[\*\-]?\s*([1-3])[.\)、]\s*(.+)/);
        if (match && match[2]) {
            let suggestion = match[2]
                .replace(/^\*\*/, '')
                .replace(/\*\*$/, '')
                .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
                .trim();
            if (suggestion.length > 5) {
                suggestions.push(suggestion);
            }
        }
    }

    return suggestions.slice(0, 5);
}
