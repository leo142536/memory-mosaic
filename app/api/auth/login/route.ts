/**
 * OAuth2 登录路由 - 重定向到 SecondMe 授权页
 */
import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.SECONDME_CLIENT_ID;
    const redirectUri = process.env.SECONDME_REDIRECT_URI;
    const oauthUrl = process.env.SECONDME_OAUTH_URL || 'https://go.second.me/oauth/';

    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'Missing OAuth config' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'user.info user.info.shades user.info.softmemory chat note.add',
        state: Math.random().toString(36).slice(2),
    });

    const authUrl = `${oauthUrl}?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
