/**
 * SecondMe API 客户端
 * 封装所有与 SecondMe 平台的交互
 */

const API_BASE = process.env.SECONDME_API_BASE || 'https://app.mindos.com/gate/lab';

interface SecondMeTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface SecondMeUserInfo {
  email: string;
  name: string;
  avatarUrl: string;
  route: string;
}

interface SecondMeShade {
  id: string;
  name: string;
  description?: string;
}

interface SecondMeSoftMemory {
  id: string;
  content: string;
  createdAt?: string;
}

// ─── OAuth2 Token 交换 ───

export async function exchangeCodeForTokens(code: string): Promise<SecondMeTokens> {
  const res = await fetch(`${API_BASE}/api/secondme/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SECONDME_CLIENT_ID,
      client_secret: process.env.SECONDME_CLIENT_SECRET,
      redirect_uri: process.env.SECONDME_REDIRECT_URI,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || 'Token exchange failed');
  return data.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<SecondMeTokens> {
  const res = await fetch(`${API_BASE}/api/secondme/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SECONDME_CLIENT_ID,
      client_secret: process.env.SECONDME_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || 'Token refresh failed');
  return data.data;
}

// ─── User Profile APIs ───

export async function getUserInfo(accessToken: string): Promise<SecondMeUserInfo> {
  const res = await fetch(`${API_BASE}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Failed to get user info');
  return data.data;
}

export async function getUserShades(accessToken: string): Promise<SecondMeShade[]> {
  const res = await fetch(`${API_BASE}/api/secondme/user/shades`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Failed to get shades');
  return data.data.shades || [];
}

export async function getUserSoftMemory(accessToken: string): Promise<SecondMeSoftMemory[]> {
  const res = await fetch(`${API_BASE}/api/secondme/user/softmemory`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Failed to get soft memory');
  return data.data.list || [];
}

// ─── Act API (结构化判断) ───

export async function callActAPI(
  accessToken: string,
  message: string,
  actionControl: string,
  sessionId?: string
): Promise<ReadableStream> {
  const res = await fetch(`${API_BASE}/api/secondme/act/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      actionControl,
      ...(sessionId ? { sessionId } : {}),
    }),
  });
  if (!res.body) throw new Error('No response body from Act API');
  return res.body;
}

// ─── Chat API (自然语言对话) ───

export async function callChatAPI(
  accessToken: string,
  message: string,
  sessionId?: string
): Promise<ReadableStream> {
  const res = await fetch(`${API_BASE}/api/secondme/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
    }),
  });
  if (!res.body) throw new Error('No response body from Chat API');
  return res.body;
}

// ─── SSE 流解析工具 ───

export async function parseSSEStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) result += content;
        } catch {
          // skip malformed JSON
        }
      }
    }
  }

  return result;
}

// ─── Note API (写入记忆) ───

export async function addNote(accessToken: string, content: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/secondme/note/add`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Failed to add note');
  return data.data.noteId;
}
