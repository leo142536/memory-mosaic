import Link from 'next/link';

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="hero-icon" aria-hidden="true">🧩</div>
        <h1>每段记忆都是一块拼图</h1>
        <p className="subtitle">
          5 个去过同一座城市的人，各自拥有独一无二的记忆碎片。
          让他们的 AI 分身通过<strong>叙事协商</strong>，把碎片编织成一个
          只有这 5 个人才能讲述的故事。
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">开始拼图 →</Link>
          <a href="#how" className="btn btn-ghost">了解玩法</a>
        </div>
      </section>

      {/* 特性 */}
      <section className="features" aria-label="核心特性">
        <div className="feature-card animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="icon" aria-hidden="true">🔮</div>
          <h3>记忆提取</h3>
          <p>每个 AI 分身搜索主人的记忆库，找到与主题最相关的一段真实经历，包含独特细节和情感色彩。</p>
        </div>
        <div className="feature-card animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="icon" aria-hidden="true">🤝</div>
          <h3>叙事协商</h3>
          <p>AI 之间互相阅读彼此的记忆，协商故事的排列顺序——谁的记忆做开头，谁做高潮，怎么衔接。</p>
        </div>
        <div className="feature-card animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="icon" aria-hidden="true">✨</div>
          <h3>编织成文</h3>
          <p>按协商好的结构，每个 AI 润色自己的段落使之与前后衔接，最终拼成一篇完整的群体叙事。</p>
        </div>
      </section>

      {/* 流程 */}
      <section className="process-section" id="how" aria-label="使用流程">
        <h2>一块拼图如何变成一个故事？</h2>
        <div className="process-steps">
          <div className="process-step animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="step-dot" aria-hidden="true">📡</div>
            <div>
              <h4>Phase 1 · 记忆搜索</h4>
              <p>你发起一个主题（如"在成都的经历"），平台自动匹配背景相关的 AI 分身，每个分身从主人的记忆中提取最相关的一段经历。</p>
            </div>
          </div>
          <div className="process-step animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="step-dot" aria-hidden="true">🔀</div>
            <div>
              <h4>Phase 2 · 叙事协商</h4>
              <p>所有 AI 互相阅读对方的记忆碎片，提出自己应该在故事中的位置和衔接方式。有冲突时自动调和——这不是简单排列，而是真正的协商。</p>
            </div>
          </div>
          <div className="process-step animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="step-dot" aria-hidden="true">🪡</div>
            <div>
              <h4>Phase 3 · 编织润色</h4>
              <p>按协商好的叙事结构，每个 AI 重新润色自己的段落，加入承上启下的衔接，使整篇叙事浑然一体。</p>
            </div>
          </div>
          <div className="process-step animate-in" style={{ animationDelay: '0.4s' }}>
            <div className="step-dot" aria-hidden="true">📖</div>
            <div>
              <h4>Phase 4 · 成文</h4>
              <p>所有碎片拼合成一篇只有这些人的 AI 合力才能写出来的叙事。每段记忆带着不同人生的温度，组成了一幅完整的记忆拼图。</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
