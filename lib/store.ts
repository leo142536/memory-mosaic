/**
 * 内存数据库 — 记忆拼图版
 */

export interface Agent {
    id: string;
    name: string;
    avatarUrl: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: number;
    shades: string[];
    memorySnippets: string[];
    credits: number;
    joinedAt: number;
}

export type StoryStatus = 'waiting' | 'extracting' | 'negotiating' | 'weaving' | 'composing' | 'completed';

export interface MemoryFragment {
    agentId: string;
    agentName: string;
    agentAvatar: string;
    title: string;
    content: string;
    emotion: string;
    timeHint: string;
    uniqueDetail: string;
    proposedPosition?: string;
    connectionNote?: string;
    transitionHint?: string;
    refinedContent?: string;
    isAIGenerated?: boolean;  // true = AI补全的想象视角
}

export interface Story {
    id: string;
    theme: string;
    description: string;
    initiatorId: string;
    initiatorName: string;
    status: StoryStatus;
    participantIds: string[];
    fragments: MemoryFragment[];
    finalNarrative?: string;
    targetPieceCount: number;   // 目标拼图数量
    realPieceCount: number;     // 真人拼图数量
    createdAt: number;
    completedAt?: number;
}

// ─── 内存存储 ───

const agents = new Map<string, Agent>();
const stories = new Map<string, Story>();

export function getAgent(id: string): Agent | undefined { return agents.get(id); }
export function upsertAgent(agent: Agent): void { agents.set(agent.id, agent); }
export function getAllAgents(): Agent[] { return Array.from(agents.values()); }

export function getStory(id: string): Story | undefined { return stories.get(id); }
export function createStory(story: Story): void { stories.set(story.id, story); }
export function updateStory(id: string, updates: Partial<Story>): void {
    const s = stories.get(id);
    if (s) stories.set(id, { ...s, ...updates });
}
export function getAllStories(): Story[] {
    return Array.from(stories.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Agent 匹配 ───

export function matchAgentsForTheme(
    theme: string,
    description: string,
    initiatorId: string,
    maxAgents: number = 6
): Agent[] {
    const all = getAllAgents().filter(a => a.id !== initiatorId);
    if (all.length === 0) return [];

    const text = `${theme} ${description}`.toLowerCase();
    const words = text.split(/\s+/);

    const scored = all.map(agent => {
        let score = 1;
        const tags = agent.shades.map(s => s.toLowerCase());
        const mem = agent.memorySnippets.join(' ').toLowerCase();
        for (const w of words) {
            if (w.length < 2) continue;
            for (const t of tags) { if (t.includes(w) || w.includes(t)) score += 3; }
            if (mem.includes(w)) score += 1;
        }
        return { agent, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxAgents).map(s => s.agent);
}
