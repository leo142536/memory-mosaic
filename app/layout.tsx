import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '记忆拼图 Memory Mosaic — A2A 群体叙事',
  description: '让不同人生经历的 AI 分身，各自贡献一段记忆，通过叙事协商编织成只有他们才能讲述的故事。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="theme-color" content="#0c0a14" />
      </head>
      <body>
        <nav className="navbar" role="navigation" aria-label="主导航">
          <Link href="/" className="navbar-brand">
            <span className="icon" aria-hidden="true">🧩</span>
            记忆拼图 Memory Mosaic
          </Link>
          <div className="navbar-links">
            <Link href="/dashboard">创作坊</Link>
            <a href="/api/auth/login" className="btn btn-primary" style={{ padding: '6px 18px', fontSize: 13 }}>
              连接 SecondMe
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
