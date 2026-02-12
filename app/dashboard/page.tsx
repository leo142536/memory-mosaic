'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Agent {
    id: string;
    name: string;
    shades: string[];
    memorySnippets: string[];
}

interface StoryItem {
    id: string;
    theme: string;
    status: string;
    fragments: { agentName: string }[];
    createdAt: number;
}

const EMOJI_MAP: Record<string, string> = {
    'demo-foodie': '🍜',
    'demo-backpacker': '🎒',
    'demo-artist': '🎨',
    'demo-techie': '💻',
    'demo-local': '🏠',
};

const STATUS_LABEL: Record<string, string> = {
    waiting: '等待中',
    extracting: '提取记忆…',
    negotiating: '叙事协商…',
    weaving: '编织润色…',
    composing: '合成中…',
    completed: '✨ 已完成',
};

export default function DashboardPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [stories, setStories] = useState<StoryItem[]>([]);
    const [theme, setTheme] = useState('');
    const [description, setDescription] = useState('');
    const [realAgentCount, setRealAgentCount] = useState(2);
    const [submitting, setSubmitting] = useState(false);
    const isDemo = true;

    const fetchAgents = useCallback(async () => {
        const res = await fetch('/api/agents');
        if (res.ok) { const data = await res.json(); setAgents(data.agents); }
    }, []);

    useEffect(() => { fetchAgents(); }, [fetchAgents]);

    // 轮询 story 状态
    useEffect(() => {
        if (stories.length === 0) return;
        const pending = stories.some(s => s.status !== 'completed');
        if (!pending) return;

        const timer = setInterval(async () => {
            const updated = await Promise.all(
                stories.map(async s => {
                    if (s.status === 'completed') return s;
                    try {
                        const res = await fetch(`/api/stories/${s.id}`);
                        if (res.ok) { const data = await res.json(); return data.story; }
                    } catch { /* ignore */ }
                    return s;
                })
            );
            setStories(updated);
        }, 2000);

        return () => clearInterval(timer);
    }, [stories]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!theme.trim() || submitting) return;

        setSubmitting(true);
        try {
            const endpoint = isDemo ? '/api/demo' : '/api/stories';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme, description, realAgentCount }),
            });
            const data = await res.json();
            if (data.storyId) {
                setStories(prev => [{
                    id: data.storyId,
                    theme,
                    status: 'extracting',
                    fragments: [],
                    createdAt: Date.now(),
                }, ...prev]);
                setTheme('');
                setDescription('');
            }
        } catch { /* ignore */ }
        setSubmitting(false);
    }

    return (
        <div className="dashboard">
            <div className="dashboard-main">
                <h2>🧩 创作坊</h2>

                {/* 创建表单 */}
                <form className="create-form" onSubmit={handleSubmit}>
                    <h3>发起新的记忆拼图 <span className="demo-tag">Demo</span></h3>
                    <div className="form-group">
                        <label htmlFor="story-theme">叙事主题</label>
                        <input
                            id="story-theme"
                            type="text"
                            name="theme"
                            autoComplete="off"
                            placeholder="例：在成都的经历 / 深夜加班的故事 / 第一次出国…"
                            value={theme}
                            onChange={e => setTheme(e.target.value)}
                        />
                        <div className="hint">选择一个有"共同经历"潜力的主题，越具体越好</div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="story-desc">补充说明（可选）</label>
                        <textarea
                            id="story-desc"
                            name="description"
                            autoComplete="off"
                            placeholder="描述你希望这个群体叙事聚焦的方向或情感基调…"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="agent-count">真人参与者数量：<strong>{realAgentCount}</strong> / 5</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>1</span>
                            <input
                                id="agent-count"
                                type="range"
                                name="realAgentCount"
                                min={1}
                                max={5}
                                value={realAgentCount}
                                onChange={e => setRealAgentCount(Number(e.target.value))}
                                style={{ flex: 1, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>5</span>
                        </div>
                        <div className="hint">
                            {realAgentCount === 5 ? '全部真人记忆，无需 AI 补全' :
                                `${realAgentCount} 块真人拼图 + ${5 - realAgentCount} 块 AI 补全（可被新加入的真人替换）`}
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={submitting || !theme.trim()}>
                            {submitting ? '正在召集记忆…' : '🧩 开始拼图'}
                        </button>
                    </div>
                </form>

                {/* 故事列表 */}
                {stories.length > 0 && (
                    <div className="story-list" role="list">
                        {stories.map(s => (
                            <Link key={s.id} href={`/story/${s.id}`} className="story-item" role="listitem">
                                <div>
                                    <div className="story-title">{s.theme}</div>
                                    <div className="story-meta">
                                        {s.fragments?.length || 0} 段记忆 · {new Date(s.createdAt).toLocaleString('zh-CN')}
                                    </div>
                                </div>
                                <span className={`status-badge ${s.status}`}>
                                    {STATUS_LABEL[s.status] || s.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {stories.length === 0 && (
                    <div className="empty-state">
                        <div className="icon" aria-hidden="true">📖</div>
                        <p>还没有故事，发起你的第一个记忆拼图吧</p>
                    </div>
                )}
            </div>

            {/* 侧栏：记忆者 */}
            <aside className="sidebar" aria-label="记忆者池">
                <h3>🧠 记忆者池</h3>
                <div className="agent-pool">
                    {agents.map(a => (
                        <div key={a.id} className="agent-card">
                            <div className="agent-avatar" aria-hidden="true">{EMOJI_MAP[a.id] || '🧑'}</div>
                            <div className="agent-info">
                                <div className="agent-name">{a.name}</div>
                                <div className="agent-tags">{a.shades.slice(0, 3).join(' · ')}</div>
                            </div>
                        </div>
                    ))}
                    {agents.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>加载中…</p>
                    )}
                </div>
            </aside>
        </div>
    );
}
