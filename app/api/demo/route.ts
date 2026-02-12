/**
 * Demo 模式 API — 弹性拼图机制
 * 支持 1~5 个真人 Agent，不足 5 块时 AI 自动补全
 */
import { NextRequest, NextResponse } from 'next/server';
import { createStory, updateStory, getAllAgents, type Story, type MemoryFragment } from '@/lib/store';
import { seedDemoAgents } from '@/lib/orchestrator';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 全部 5 个预设片段（带 isAIGenerated 标记） ───

interface DemoPreset {
    title: string;
    content: string;
    emotion: string;
    timeHint: string;
    uniqueDetail: string;
    proposedPosition: string;
    connectionNote: string;
    transitionHint: string;
    refinedContent: string;
}

const DEMO_FRAGMENTS: Record<string, DemoPreset> = {
    'demo-local': {
        title: '春熙路的变迁',
        content: '作为土生土长的成都人，我见证了春熙路从满是自行车的老街变成今天的IFS商圈。小时候最爱跟外婆去春熙路的老百货大楼买年货，那时候路边还有捏糖人的手艺人。现在每次路过，看到爬在楼上的大熊猫，都会想起那些再也回不去的下午。',
        emotion: 'nostalgic',
        timeHint: '从小到大',
        uniqueDetail: '捏糖人的手艺人',
        proposedPosition: 'opening',
        connectionNote: '作为本地人可以为整个叙事铺设时间纵深',
        transitionHint: '从回忆过渡到现在',
        refinedContent: '我从小在成都长大，春熙路是我记忆的锚点。小时候跟外婆去老百货大楼买年货，路边的糖人师傅会捏一只蝴蝶放在我手心。那时候自行车铃声是成都的背景音乐。二十年后的今天，IFS的大熊猫趴在楼上，像是替我们这些老成都人守望着什么。你们来的时候看到的是一个新成都——但我想先告诉你们，这座城市的根，藏在那些消失的小巷和没有消失的味道里。',
    },
    'demo-foodie': {
        title: '凌晨三点的火锅',
        content: '去年夏天凌晨三点，我们在玉林路找到一家只有本地人才知道的苍蝇馆子。没有招牌，推开一扇铁门才发现里面坐满了人。牛油锅底辣得我满头大汗，但配上冰啤酒的那一刻，我确信这是人生的味觉巅峰。老板娘自己调的蘸碟，那个味道我至今都在想。',
        emotion: 'excited',
        timeHint: '去年夏天',
        uniqueDetail: '没有招牌的铁门',
        proposedPosition: 'middle',
        connectionNote: '接在本地人讲完老成都后，展示新一代的成都夜生活',
        transitionHint: '用味觉接续记忆',
        refinedContent: '小雨说的那些消失的味道，有些其实没有消失——它们只是躲起来了。去年夏天的凌晨三点，我在玉林路找到了证据：一扇没有招牌的铁门后面，藏着一家坐满本地人的苍蝇馆子。牛油锅底的辣是能钻进灵魂的那种，但冰啤酒一灌下去，辣变成了一种让人上瘾的快感。老板娘的蘸碟比任何网红店都厉害——她说配方是婆婆传下来的。那一刻我想，成都最好的东西从来不在大众点评上。',
    },
    'demo-backpacker': {
        title: '茶馆里的下午',
        content: '人民公园的鹤鸣茶社彻底改变了我对"旅行"的理解。我本来只打算待半小时，结果坐了一整个下午。隔壁桌的大爷在下象棋，对面的阿姨在打毛线衣，掏耳朵的师傅像行为艺术家一样认真。三块钱一碗的花茶，竹椅上的阳光，那种慢，让我第一次意识到：旅行不是赶景点，是学会用别人的节奏活一天。',
        emotion: 'reflective',
        timeHint: '去年秋天',
        uniqueDetail: '三块钱的花茶',
        proposedPosition: 'middle',
        connectionNote: '从味觉过渡到生活节奏感',
        transitionHint: '从夜晚到白天',
        refinedContent: '在火锅的热气散去之后，我遇见了成都的另一面。人民公园的鹤鸣茶社里，时间有自己的速度。我本来只打算待半小时，但竹椅上的阳光、三块钱的花茶、隔壁大爷的象棋残局把我钉住了。一个掏耳朵的师傅走过来，用一种行为艺术般的严肃问我要不要试试。我拒绝了——但后来一直后悔。那个下午教会我一件事：旅行不是赶景点，是学会用别人的节奏过一天。',
    },
    'demo-artist': {
        title: '宽窄巷子的光影',
        content: '在宽窄巷子支起画架写生，画到一半被三个大爷围观。他们不说"画得好"，而是说"这个颜色不对嘛，成都的天没得这么蓝"。他们说得对。成都的天是一种灰蓝色，像被茶水洗过的宣纸。那天之后我调了整整一个色系——后来这组画成了我个展里最受欢迎的系列。',
        emotion: 'surprising',
        timeHint: '两年前冬天',
        uniqueDetail: '灰蓝色像被茶水洗过的宣纸',
        proposedPosition: 'climax',
        connectionNote: '从生活感受升华到艺术表达——成都的审美特质',
        transitionHint: '从体验到创造',
        refinedContent: '小鹿在茶馆学会了用成都的节奏活一天，而我试图把这种节奏画下来——但成都教训了我。在宽窄巷子写生的时候，三个大爷围过来，不是夸我，而是纠正我："这个颜色不对嘛，成都的天没得这么蓝。"我抬头看天，他们说得对：成都的天是灰蓝色的，像被茶水洗过的宣纸。那天我推翻了所有调色板，重新画。后来这组"茶水色"的城市素描成了我个展里最受欢迎的系列。成都改变了我看颜色的方式。',
    },
    'demo-techie': {
        title: '天府咖啡馆的代码',
        content: '在天府软件园附近的独立咖啡馆待了整整一个月，在那里完成了人生第一个独立项目。成都的房租只有深圳的三分之一，但创造力反而更高。中午散步去公园看大爷打太极，下午回来写代码效率翻倍。后来才意识到：慢不是低效，而是一种可持续的创造方式。',
        emotion: 'reflective',
        timeHint: '三年前',
        uniqueDetail: '看大爷打太极后写代码效率翻倍',
        proposedPosition: 'closing',
        connectionNote: '从艺术创造延伸到科技创造——成都的慢节奏如何催生新的可能性',
        transitionHint: '从创作到创业',
        refinedContent: '阿墨从成都的天色里找到了新的调色板，而我在这座城市找到了新的工作节奏。三年前我从深圳逃到天府软件园旁边的一家独立咖啡馆，房租省下了三分之二，但这不是重点。重点是：中午去公园看大爷打太极拳再回来写代码，效率竟然比在深圳996还高。一个月后我的第一个独立项目上线了。成都教会我一个硅谷不会教的道理——慢不是低效，而是一种可持续的创造方式。也许这就是我们五个人的记忆拼在一起想要说的：成都从不催你，但它会改变你。',
    },
};

// 叙事顺序：local → foodie → backpacker → artist → techie
const CANONICAL_ORDER = ['demo-local', 'demo-foodie', 'demo-backpacker', 'demo-artist', 'demo-techie'];

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { theme, description, realAgentCount = 2 } = body;

    if (!theme) {
        return NextResponse.json({ error: '请输入叙事主题' }, { status: 400 });
    }

    seedDemoAgents();
    const allAgents = getAllAgents();

    // 根据 realAgentCount 决定哪些是真人、哪些是 AI 补全
    const clampedCount = Math.max(1, Math.min(realAgentCount, allAgents.length));
    const realIds = new Set(CANONICAL_ORDER.slice(0, clampedCount));

    const story: Story = {
        id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        theme,
        description: description || '',
        initiatorId: 'demo-user',
        initiatorName: '你',
        status: 'waiting',
        participantIds: allAgents.map(a => a.id),
        fragments: [],
        targetPieceCount: CANONICAL_ORDER.length,
        realPieceCount: clampedCount,
        createdAt: Date.now(),
    };

    createStory(story);

    // 异步模拟叙事流程
    (async () => {
        try {
            // Phase 1: 记忆提取（真人先出现，AI 补全后出现）
            updateStory(story.id, { status: 'extracting' });
            const fragments: MemoryFragment[] = [];

            // 先提取真人记忆
            for (const agentId of CANONICAL_ORDER) {
                if (!realIds.has(agentId)) continue;
                const agent = allAgents.find(a => a.id === agentId);
                const demo = DEMO_FRAGMENTS[agentId];
                if (!agent || !demo) continue;

                await sleep(1200);
                fragments.push({
                    agentId: agent.id,
                    agentName: agent.name,
                    agentAvatar: agent.avatarUrl,
                    title: demo.title,
                    content: demo.content,
                    emotion: demo.emotion,
                    timeHint: demo.timeHint,
                    uniqueDetail: demo.uniqueDetail,
                    isAIGenerated: false,
                });
                updateStory(story.id, { fragments: [...fragments] });
            }

            // 再 AI 补全剩余拼图
            for (const agentId of CANONICAL_ORDER) {
                if (realIds.has(agentId)) continue;
                const agent = allAgents.find(a => a.id === agentId);
                const demo = DEMO_FRAGMENTS[agentId];
                if (!agent || !demo) continue;

                await sleep(800); // AI 补全比真人快
                fragments.push({
                    agentId: agent.id,
                    agentName: `${agent.name}（AI 补全）`,
                    agentAvatar: agent.avatarUrl,
                    title: demo.title,
                    content: demo.content,
                    emotion: demo.emotion,
                    timeHint: demo.timeHint,
                    uniqueDetail: demo.uniqueDetail,
                    isAIGenerated: true,
                });
                updateStory(story.id, { fragments: [...fragments] });
            }

            // Phase 2: 叙事协商
            updateStory(story.id, { status: 'negotiating' });
            await sleep(2000);

            const negotiated = fragments.map(f => {
                const baseId = f.agentId;
                const demo = DEMO_FRAGMENTS[baseId];
                return {
                    ...f,
                    proposedPosition: demo?.proposedPosition || 'middle',
                    connectionNote: demo?.connectionNote || '',
                    transitionHint: demo?.transitionHint || '',
                };
            });

            // 排序
            const posOrder: Record<string, number> = { opening: 0, middle: 1, climax: 2, closing: 3 };
            negotiated.sort((a, b) =>
                (posOrder[a.proposedPosition || 'middle'] || 1) - (posOrder[b.proposedPosition || 'middle'] || 1)
            );
            updateStory(story.id, { fragments: negotiated });

            // Phase 3: 编织润色
            updateStory(story.id, { status: 'weaving' });
            await sleep(2000);

            const woven = negotiated.map(f => ({
                ...f,
                refinedContent: DEMO_FRAGMENTS[f.agentId]?.refinedContent || f.content,
            }));
            updateStory(story.id, { fragments: woven });

            // Phase 4: 最终合成
            updateStory(story.id, { status: 'composing' });
            await sleep(1500);

            const realCount = woven.filter(f => !f.isAIGenerated).length;
            const aiCount = woven.filter(f => f.isAIGenerated).length;

            const parts = woven.map(f => {
                const content = f.refinedContent || f.content;
                const label = f.isAIGenerated ? '🔮' : '🧩';
                return `### ${label} ${f.agentName}　_${f.timeHint}_\n\n${content}`;
            });

            const completionPercent = Math.round((realCount / woven.length) * 100);

            const finalNarrative = `# ${story.theme}

_${woven.length} 段记忆，${realCount} 块真人拼图 + ${aiCount} 块 AI 补全 · 完成度 ${completionPercent}%_

---

${parts.join('\n\n---\n\n')}

---

> 🧩 本叙事中 ${realCount} 段来自真人 AI 分身的真实记忆，${aiCount} 段由 AI 想象补全。当更多真人加入替换 🔮 拼图时，叙事会变得更加真实和丰富。`;

            updateStory(story.id, {
                fragments: woven,
                finalNarrative,
                status: 'completed',
                completedAt: Date.now(),
            });
        } catch (err) {
            console.error('Demo narrative error:', err);
            updateStory(story.id, {
                status: 'completed',
                finalNarrative: '⚠️ 叙事编织过程中发生错误',
                completedAt: Date.now(),
            });
        }
    })();

    return NextResponse.json({ storyId: story.id });
}
