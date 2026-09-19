import { NextResponse } from 'next/server';
import { runSofiaTurn } from '../../../lib/sofiaEngine';
import { getFeatureFlags } from '../../../lib/featureFlags';

export const runtime = 'nodejs';
export const maxDuration = 60;

function sanitizeIncomingMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m === 'object' && m.role !== 'system')
    .map((m) => {
      // Only forward fields OpenAI's Chat Completions API actually accepts.
      const { role, content, tool_calls, tool_call_id, name } = m;
      const out = { role, content: content ?? null };
      if (tool_calls) out.tool_calls = tool_calls;
      if (tool_call_id) out.tool_call_id = tool_call_id;
      if (name) out.name = name;
      return out;
    });
}

export async function POST(request) {
  const { FEATURE_CHAT } = await getFeatureFlags();
  if (!FEATURE_CHAT) {
    return NextResponse.json({ error: 'Chat desativado.' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const incoming = sanitizeIncomingMessages(body?.messages);
  const { reply, historico, ok } = await runSofiaTurn(incoming, { today: new Date() });

  if (!ok) {
    return NextResponse.json({ reply, messages: historico }, { status: 500 });
  }

  return NextResponse.json({ reply, messages: historico });
}
