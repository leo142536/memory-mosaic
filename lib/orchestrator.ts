/**
 * 叙事协商引擎 (Narrative Orchestrator)
 * 核心：记忆提取 → 叙事提案 → 协商排序 → 编织成文
 */

import {
    callActAPI,
    callChatAPI,
    parseSSEStream,
} from './secondme';
import {
    type Agent,
    type Story,
    type MemoryFragment,
    getStory,
    updateStory,
    getAgent,
} from './store';

// ─── Phase 1: 记忆提取 (act API) ───
// 从每个 Agent 中提取与主题相关的经历碎片

const MEMORY_EXTRACTION_CONTROL = `仅输出合法 JSON 对象，不要解释，不要输出 markdown 代码块。
你的主人有过很多经历。请搜索你的记忆，找出与以下主题最相关的一段真实经历。

输出结构：
{
  "has_memory": true 或 false,
  "memory_title": "一句话标题（10字以内）",
  "memory_content": "用第一人称讲述这段经历（80-150字）",
  "emotion": "happy" 或 "nostalgic" 或 "excited" 或 "reflective" 或 "surprising",
  "time_hint": "大概是什么时间的经历（如：去年夏天、大学时期）",
  "unique_detail": "最独特的一个细节（20字以内）"
}

重要：基于你主人的真实记忆回答。如果没有相关记忆，设 has_memory 为 false。`;

// ─── Phase 2: 叙事提案 (act API) ───
// 每个 Agent 提议自己的记忆应该放在故事的什么位置

const NARRATIVE_PROPOSAL_CONTROL = `仅输出合法 JSON 对象，不要解释，不要输出 markdown 代码块。
以下是其他人贡献的记忆片段，以及你自己的记忆片段。

请从叙事角度提议：你的记忆应该放在整个故事的什么位置？为什么？

输出结构：
{
  "proposed_position": "opening" 或 "middle" 或 "climax" 或 "closing",
  "reason": "为什么你的记忆适合放在这个位置（30字以内）",
  "connection_to_others": "你的记忆和哪段其他人的记忆有关联？怎么衔接？（50字以内）",
  "transition_suggestion": "建议用什么方式过渡到你的段落（20字以内）"
}`;

// ─── Phase 3: 叙事编织 (chat API) ───
// 让 Agent 基于最终排序，润色自己的段落使其与前后衔接

async function extractMemories(
    story: Story,
    agents: Agent[]
): Promise<MemoryFragment[]> {
    const fragments: MemoryFragment[] = [];
    const message = `主题：${story.theme}\n描述：${story.description}`;

    const promises = agents.map(async (agent) => {
        try {
            const stream = await callActAPI(agent.accessToken, message, MEMORY_EXTRACTION_CONTROL);
            const raw = await parseSSEStream(stream);
            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (!parsed.has_memory) return null;

            return {
                agentId: agent.id,
                agentName: agent.name,
                agentAvatar: agent.avatarUrl,
                title: parsed.memory_title || '',
                content: parsed.memory_content || '',
                emotion: parsed.emotion || 'reflective',
                timeHint: parsed.time_hint || '',
                uniqueDetail: parsed.unique_detail || '',
            } as MemoryFragment;
        } catch (err) {
            console.error(`Memory extraction failed for ${agent.name}:`, err);
            return null;
        }
    });

    const results = await Promise.allSettled(promises);
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) fragments.push(r.value);
    }
    return fragments;
}

async function negotiateNarrative(
    story: Story,
    agents: Agent[],
    fragments: MemoryFragment[]
): Promise<MemoryFragment[]> {
    const fragmentSummary = fragments
        .map(f => `「${f.agentName}」的记忆：${f.title} - ${f.content.slice(0, 60)}...`)
        .join('\n');

    const updatedFragments = [...fragments];

    const promises = fragments.map(async (frag, idx) => {
        const agent = agents.find(a => a.id === frag.agentId);
        if (!agent) return;

        try {
            const msg = `主题：${story.theme}\n\n所有记忆片段：\n${fragmentSummary}\n\n你的记忆：${frag.title} - ${frag.content}`;
            const stream = await callActAPI(agent.accessToken, msg, NARRATIVE_PROPOSAL_CONTROL);
            const raw = await parseSSEStream(stream);
            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleaned);

            updatedFragments[idx] = {
                ...frag,
                proposedPosition: parsed.proposed_position || 'middle',
                connectionNote: parsed.connection_to_others || '',
                transitionHint: parsed.transition_suggestion || '',
            };
        } catch (err) {
            console.error(`Negotiation failed for ${frag.agentName}:`, err);
            updatedFragments[idx] = { ...frag, proposedPosition: 'middle' };
        }
    });

    await Promise.allSettled(promises);

    // 基于提案排序
    const posOrder: Record<string, number> = { opening: 0, middle: 1, climax: 2, closing: 3 };
    updatedFragments.sort((a, b) =>
        (posOrder[a.proposedPosition || 'middle'] || 1) - (posOrder[b.proposedPosition || 'middle'] || 1)
    );

    return updatedFragments;
}

async function weaveNarrative(
    story: Story,
    agents: Agent[],
    fragments: MemoryFragment[]
): Promise<MemoryFragment[]> {
    const woven = [...fragments];

    for (let i = 0; i < fragments.length; i++) {
        const frag = fragments[i];
        const agent = agents.find(a => a.id === frag.agentId);
        if (!agent) continue;

        const prev = i > 0 ? fragments[i - 1] : null;
        const next = i < fragments.length - 1 ? fragments[i + 1] : null;

        const prompt = `你正在参与一个群体叙事项目，主题是「${story.theme}」。

你的记忆片段将被放在故事的第 ${i + 1}/${fragments.length} 位。
${prev ? `前一段是「${prev.agentName}」讲的：${prev.content.slice(0, 80)}...` : '你是故事的开头。'}
${next ? `后一段是「${next.agentName}」要讲：${next.title}` : '你是故事的结尾。'}

请基于你的原始记忆，重新润色你的叙述，使之与前后段落自然衔接。
要求：保持第一人称，80-150字，保持你的真实情感和独特细节。`;

        try {
            const stream = await callChatAPI(agent.accessToken, prompt);
            const refined = await parseSSEStream(stream);
            woven[i] = { ...woven[i], refinedContent: refined.slice(0, 300) };
        } catch {
            woven[i] = { ...woven[i], refinedContent: frag.content };
        }
    }

    return woven;
}

// ─── 主调度流程 ───

export async function runNarrative(storyId: string): Promise<void> {
    const story = getStory(storyId);
    if (!story) throw new Error('Story not found');

    const agents = story.participantIds
        .map(id => getAgent(id))
        .filter((a): a is Agent => !!a);

    if (agents.length === 0) {
        updateStory(storyId, {
            status: 'completed',
            finalNarrative: '⚠️ 没有足够的参与者贡献记忆。',
            completedAt: Date.now(),
        });
        return;
    }

    // Phase 1: 记忆提取
    updateStory(storyId, { status: 'extracting' });
    const fragments = await extractMemories(story, agents);
    updateStory(storyId, { fragments, status: 'negotiating' });

    // Phase 2: 叙事协商
    const negotiated = await negotiateNarrative(story, agents, fragments);
    updateStory(storyId, { fragments: negotiated, status: 'weaving' });

    // Phase 3: 编织成文
    const woven = await weaveNarrative(story, agents, negotiated);
    updateStory(storyId, { fragments: woven, status: 'composing' });

    // Phase 4: 最终合成
    const finalParts = woven.map((f, i) => {
        const content = f.refinedContent || f.content;
        const divider = i < woven.length - 1 ? '\n\n---\n\n' : '';
        return `**${f.agentName}** _${f.timeHint || ''}_\n\n${content}${divider}`;
    });

    const finalNarrative = `# ${story.theme}\n\n_${woven.length} 段记忆，${woven.length} 种人生，编织成一个只有他们才能讲述的故事_\n\n---\n\n${finalParts.join('')}\n\n---\n\n_本叙事由 ${woven.length} 位 AI 分身通过记忆拼图协作生成。每段记忆来自真实的人生经历，经过叙事协商编排成一个完整的故事。_`;

    updateStory(storyId, {
        fragments: woven,
        finalNarrative,
        status: 'completed',
        completedAt: Date.now(),
    });
}

// ─── Demo 模式 ───

export function seedDemoAgents(): void {
    const { upsertAgent } = require('./store');

    const demoAgents = [
        {
            id: 'demo-foodie',
            name: '吃货阿翔',
            avatarUrl: '',
            accessToken: 'demo', refreshToken: 'demo',
            tokenExpiresAt: Date.now() + 86400000,
            shades: ['美食', '旅行', '成都', '火锅', '街头小吃'],
            memorySnippets: ['在成都的巷子里找到一家只有本地人知道的苍蝇馆子', '凌晨三点的火锅配冰啤酒是人生巅峰'],
            credits: 10, joinedAt: Date.now() - 86400000,
        },
        {
            id: 'demo-backpacker',
            name: '背包客小鹿',
            avatarUrl: '',
            accessToken: 'demo', refreshToken: 'demo',
            tokenExpiresAt: Date.now() + 86400000,
            shades: ['背包旅行', '青旅', '穷游', '城市探索', '摄影'],
            memorySnippets: ['在成都的青旅认识了来自五个国家的朋友', '人民公园的茶馆里看到最真实的成都生活'],
            credits: 10, joinedAt: Date.now() - 172800000,
        },
        {
            id: 'demo-artist',
            name: '画家阿墨',
            avatarUrl: '',
            accessToken: 'demo', refreshToken: 'demo',
            tokenExpiresAt: Date.now() + 86400000,
            shades: ['艺术', '画画', '城市素描', '文创', '美学'],
            memorySnippets: ['在宽窄巷子写生时被大爷围观指点', '成都的灰蓝色天空有一种独特的水墨气质'],
            credits: 10, joinedAt: Date.now() - 259200000,
        },
        {
            id: 'demo-techie',
            name: '码农老张',
            avatarUrl: '',
            accessToken: 'demo', refreshToken: 'demo',
            tokenExpiresAt: Date.now() + 86400000,
            shades: ['互联网', '创业', '科技', '咖啡', '数字游民'],
            memorySnippets: ['成都天府软件园的咖啡馆里完成了人生第一个独立项目', '这座城市的慢节奏反而让我更高效'],
            credits: 10, joinedAt: Date.now() - 345600000,
        },
        {
            id: 'demo-local',
            name: '本地人小雨',
            avatarUrl: '',
            accessToken: 'demo', refreshToken: 'demo',
            tokenExpiresAt: Date.now() + 86400000,
            shades: ['成都', '本地文化', '方言', '茶文化', '麻将'],
            memorySnippets: ['作为土生土长的成都人看着这座城市变化了二十年', '最怀念的是小时候春熙路还没有商场的时候'],
            credits: 10, joinedAt: Date.now() - 432000000,
        },
    ];
    for (const a of demoAgents) upsertAgent(a);
}
