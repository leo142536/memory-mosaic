'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface MemoryFragment {
    agentId: string;
    agentName: string;
    title: string;
    content: string;
    emotion: string;
    timeHint: string;
    uniqueDetail: string;
    proposedPosition?: string;
    connectionNote?: string;
    transitionHint?: string;
    refinedContent?: string;
}

interface StoryDetail {
    id: string;
    theme: string;
    description: string;
    status: string;
    fragments: MemoryFragment[];
    finalNarrative?: string;
    createdAt: number;
    completedAt?: number;
}

const EMOJI_MAP: Record<string, string> = {
    'demo-foodie': '🍜',
    'demo-backpacker': '🎒',
    'demo-artist': '🎨',
    'demo-techie': '💻',
    'demo-local': '🏠',
};

const EMOTION_LABEL: Record<string, string> = {
    happy: '😊 开心',
    nostalgic: '🌅 怀旧',
    excited: '🔥 兴奋',
    reflective: '💭 沉思',
    surprising: '✨ 惊喜',
};

const POSITION_LABEL: Record<string, string> = {
    opening: '🎬 开篇',
    middle: '📖 承接',
    climax: '⚡ 高潮',
    closing: '🌙 收尾',
};

const STATUS_STEPS = [
    { key: 'extracting', label: '记忆提取', icon: '📡' },
    { key: 'negotiating', label: '叙事协商', icon: '🔀' },
    { key: 'weaving', label: '编织润色', icon: '🪡' },
    { key: 'composing', label: '合成', icon: '📖' },
    { key: 'completed', label: '完成', icon: '✨' },
];

const STATUS_ORDER = ['extracting', 'negotiating', 'weaving', 'composing', 'completed'];

function getStepState(current: string, step: string): 'done' | 'active' | 'pending' {
    const ci = STATUS_ORDER.indexOf(current);
    const si = STATUS_ORDER.indexOf(step);
    if (si < ci) return 'done';
    if (si === ci) return 'active';
    return 'pending';
}

const LOADING_TEXT: Record<string, string> = {
    extracting: '正在搜索每个 AI 分身主人的记忆库…',
    negotiating: 'AI 分身们正在协商叙事结构——谁先讲，怎么接…',
    weaving: '按协商好的顺序润色段落，加入衔接过渡…',
    composing: '拼合所有碎片，生成最终叙事…',
};

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [story, setStory] = useState<StoryDetail | null>(null);
    const [error, setError] = useState('');
    const [showRefined, setShowRefined] = useState(true);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        async function fetchStory() {
            try {
                const res = await fetch(`/api/stories/${id}`);
                if (!res.ok) { setError('故事不存在'); return; }
                const data = await res.json();
                setStory(data.story);

                if (data.story.status !== 'completed') {
                    timer = setTimeout(fetchStory, 2000);
                }
            } catch {
                setError('加载失败');
            }
        }

        fetchStory();
        return () => clearTimeout(timer);
    }, [id]);

    if (error) {
        return (
            <div className="story-page">
                <div className="empty-state">
                    <div className="icon" aria-hidden="true">⚠️</div>
                    <p>{error}</p>
                    <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>返回创作坊</Link>
                </div>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="story-page">
                <div className="loading-area" role="status" aria-label="加载中">
                    <div className="spinner" />
                    <div className="loading-text">加载中…</div>
                </div>
            </div>
        );
    }

    const fragments = story.fragments || [];
    const hasNegotiation = story.status !== 'extracting' && story.status !== 'waiting';
    const hasRefined = story.status === 'weaving' || story.status === 'composing' || story.status === 'completed';

    return (
        <div className="story-page">
            {/* Header */}
            <header className="story-header animate-in">
                <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                    ← 返回创作坊
                </Link>
                <h1 style={{ marginTop: 12 }}>{story.theme}</h1>
                {story.description && <p className="story-desc">{story.description}</p>}

                <div className="progress-bar" role="progressbar" aria-label="叙事进度">
                    {STATUS_STEPS.map(step => {
                        const state = getStepState(story.status, step.key);
                        return (
                            <div key={step.key} className={`progress-step ${state}`}>
                                <div className="dot" />
                                <span aria-hidden="true">{step.icon}</span> {step.label}
                            </div>
                        );
                    })}
                </div>
            </header>

            {/* Loading */}
            {story.status !== 'completed' && (
                <div className="loading-area" role="status" aria-live="polite">
                    <div className="spinner" />
                    <div className="loading-text">{LOADING_TEXT[story.status] || '处理中…'}</div>
                </div>
            )}

            {/* 切换显示 */}
            {hasRefined && fragments.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }} role="tablist" aria-label="显示模式">
                    <button
                        role="tab"
                        aria-selected={showRefined}
                        className={`btn ${showRefined ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '6px 18px', fontSize: 13 }}
                        onClick={() => setShowRefined(true)}
                    >
                        🪡 编织后
                    </button>
                    <button
                        role="tab"
                        aria-selected={!showRefined}
                        className={`btn ${!showRefined ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '6px 18px', fontSize: 13 }}
                        onClick={() => setShowRefined(false)}
                    >
                        💎 原始记忆
                    </button>
                </div>
            )}

            {/* 记忆拼图可视化 */}
            {fragments.length > 0 && (
                <div className="mosaic-visual" role="list" aria-label="记忆碎片">
                    {fragments.map((frag, i) => (
                        <div key={frag.agentId} role="listitem">
                            <article
                                className={`mosaic-piece ${frag.proposedPosition || 'middle'}`}
                                style={{ animationDelay: `${i * 0.15}s` }}
                            >
                                <div className="piece-avatar" aria-hidden="true">
                                    {EMOJI_MAP[frag.agentId] || '🧑'}
                                </div>
                                <div className="piece-content">
                                    <div className="piece-header">
                                        <span className="piece-name">{frag.agentName}</span>
                                        <span className="piece-time">{frag.timeHint}</span>
                                        <span className={`piece-emotion ${frag.emotion}`}>
                                            {EMOTION_LABEL[frag.emotion] || frag.emotion}
                                        </span>
                                        {frag.proposedPosition && hasNegotiation && (
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 999, fontSize: 11,
                                                background: 'rgba(139,110,199,0.15)', color: 'var(--secondary)',
                                            }}>
                                                {POSITION_LABEL[frag.proposedPosition] || frag.proposedPosition}
                                            </span>
                                        )}
                                    </div>

                                    <div className="piece-text">
                                        {showRefined && frag.refinedContent ? frag.refinedContent : frag.content}
                                    </div>

                                    <div className="piece-detail">
                                        <span aria-hidden="true">💎</span> {frag.uniqueDetail}
                                    </div>

                                    {/* 协商信息 */}
                                    {hasNegotiation && frag.connectionNote && (
                                        <div className="negotiation-panel">
                                            <div className="n-label">🤝 叙事协商</div>
                                            <p>{frag.connectionNote}</p>
                                            {frag.transitionHint && (
                                                <p style={{ marginTop: 4, fontStyle: 'italic' }}>
                                                    过渡方式：{frag.transitionHint}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </article>

                            {/* 连接线 */}
                            {i < fragments.length - 1 && hasRefined && (
                                <div className="connector" aria-hidden="true">
                                    <span className="arrow">↓</span>
                                    {fragments[i + 1]?.transitionHint || '衔接'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 最终叙事 */}
            {story.finalNarrative && story.status === 'completed' && (
                <section className="final-narrative animate-in" aria-label="完整叙事">
                    <h2>📖 完整叙事</h2>
                    <div className="narrative-content">
                        {story.finalNarrative.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h3 key={i} style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)', textWrap: 'balance' }}>{line.slice(2)}</h3>;
                            if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 17, color: 'var(--primary)', marginTop: 24, marginBottom: 4, fontFamily: 'var(--font-serif)' }}>{line.slice(4)}</h4>;
                            if (line.startsWith('_') && line.endsWith('_')) return <p key={i} style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 16 }}>{line.slice(1, -1)}</p>;
                            if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '20px 0' }} />;
                            if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '3px solid var(--secondary)', paddingLeft: 16, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 24 }}>{line.slice(2)}</blockquote>;
                            if (line.trim() === '') return <br key={i} />;
                            return <p key={i} style={{ marginBottom: 4 }}>{line}</p>;
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
