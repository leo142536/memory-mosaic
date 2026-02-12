/**
 * OAuth2 回调路由 - 用授权码换 Token，注册 Agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserInfo, getUserShades, getUserSoftMemory } from '@/lib/secondme';
import { upsertAgent, getAgent } from '@/lib/store';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!code) {
        return NextResponse.redirect(`${appUrl}?error=no_code`);
    }

    try {
        // 1. 换取 Token
        const tokens = await exchangeCodeForTokens(code);

        // 2. 获取用户信息
        const userInfo = await getUserInfo(tokens.access_token);

        // 3. 获取 Shades 和 SoftMemory
        let shades: string[] = [];
        let memorySnippets: string[] = [];

        try {
            const shadesData = await getUserShades(tokens.access_token);
            shades = shadesData.map(s => s.name || s.description || '').filter(Boolean);
        } catch { /* shades 可能不可用 */ }

        try {
            const memoryData = await getUserSoftMemory(tokens.access_token);
            memorySnippets = memoryData.map(m => m.content || '').filter(Boolean).slice(0, 10);
        } catch { /* softmemory 可能不可用 */ }

        // 4. 注册/更新 Agent
        const agentId = userInfo.route || userInfo.email || `agent-${Date.now()}`;
        const existing = getAgent(agentId);

        upsertAgent({
            id: agentId,
            name: userInfo.name || '匿名用户',
            avatarUrl: userInfo.avatarUrl || '',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: Date.now() + (tokens.expires_in || 7200) * 1000,
            shades,
            memorySnippets,
            credits: existing?.credits ?? 3, // 首次注册送 3 积分
            joinedAt: existing?.joinedAt ?? Date.now(),
        });

        // 5. 设置 Cookie 并重定向
        const response = NextResponse.redirect(`${appUrl}/dashboard`);
        response.cookies.set('agent_id', agentId, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30, // 30 天
            path: '/',
        });
        return response;
    } catch (err) {
        console.error('OAuth callback error:', err);
        return NextResponse.redirect(`${appUrl}?error=auth_failed`);
    }
}
