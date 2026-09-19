import OpenAI from 'openai';
import { buildSystemPrompt, saudacaoPorHorario } from './chatSystemPrompt';
import { executeTool, toolDefinitions } from './chatTools';
import { MAX_TOOL_ROUNDS, getSiteConfig } from './config';

function fallbackReply(siteConfig) {
  return `Ops, tive um probleminha aqui. Pode tentar de novo? Se preferir, fala com a gente pelo WhatsApp ${siteConfig.CLINIC_PHONE_DISPLAY}.`;
}

// historico: mensagens já sanitizadas (role user/assistant/tool), SEM a
// mensagem system — esta função monta e injeta a dela própria, com `today`.
// Nunca lança: erros de OpenAI/tool sempre resolvem para um reply de fallback
// (ok:false), para que tanto o chat do site quanto o webhook do WhatsApp
// possam confiar que sempre recebem algo para mostrar/enviar ao usuário.
//
// primeiraMensagem / saudarNovamente: sinais explícitos passados pelo
// chamador (não inferidos pelo modelo) — o modelo não vê timestamps nem
// sabe com certeza se o histórico está vazio "de verdade" ou só foi
// truncado, então decidir isso no código é mais confiável do que confiar
// numa instrução do tipo "se não houver histórico anterior".
export async function runSofiaTurn(
  historico,
  { today = new Date(), saudarNovamente = false, primeiraMensagem = false } = {}
) {
  const siteConfig = await getSiteConfig();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada — defina no .env.');
    return { reply: fallbackReply(siteConfig), historico: [], ok: false };
  }

  const client = new OpenAI({ apiKey });

  try {
    let systemPrompt = await buildSystemPrompt({ today, config: siteConfig });
    const saudacao = saudacaoPorHorario(today, siteConfig.CLINIC_TIMEZONE);
    if (primeiraMensagem) {
      systemPrompt += `\n\n[Contexto só desta resposta: esta é a primeira mensagem do paciente nesta conversa (sem histórico anterior). Comece com uma saudação breve e profissional apropriada ao horário atual — use "${saudacao}" (ex.: "${saudacao}! Aqui é a Sofia, da ${siteConfig.CLINIC_NOME} 😊" + o que for responder). Nas mensagens seguintes desta mesma conversa, não repita saudação.]`;
    } else if (saudarNovamente) {
      systemPrompt += `\n\n[Contexto só desta resposta: o paciente ficou um bom tempo sem mandar mensagem nesta conversa e acabou de voltar. Cumprimente-o brevemente de novo antes de continuar, usando "${saudacao}" (ex.: "${saudacao}! Vamos continuar de onde paramos?"), sem ignorar ou repetir o que já foi conversado antes.]`;
    }
    const systemMessage = { role: 'system', content: systemPrompt };
    // Defesa contra histórico já corrompido (ex.: salvo antes da correção do
    // corte por tamanho): uma mensagem "tool" logo no início, sem o
    // "assistant" com tool_calls correspondente antes dela, faz a OpenAI
    // rejeitar a conversa inteira.
    let historicoSaneado = historico || [];
    while (historicoSaneado.length && historicoSaneado[0].role === 'tool') {
      historicoSaneado = historicoSaneado.slice(1);
    }
    const conversation = [systemMessage, ...historicoSaneado];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await client.chat.completions.create({
        model,
        messages: conversation,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: 300,
      });

      const message = completion.choices[0].message;
      conversation.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { reply: message.content || '', historico: conversation.slice(1), ok: true };
      }

      for (const toolCall of message.tool_calls) {
        let result;
        try {
          const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          result = await executeTool(toolCall.function.name, args);
        } catch (err) {
          result = { erro: err.message || 'Falha ao executar a ferramenta.' };
        }
        conversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Tool-round budget exhausted: força uma resposta final sem tools.
    const finalCompletion = await client.chat.completions.create({
      model,
      messages: conversation,
      tool_choice: 'none',
      max_tokens: 300,
    });
    const finalMessage = finalCompletion.choices[0].message;
    conversation.push(finalMessage);

    return { reply: finalMessage.content || fallbackReply(siteConfig), historico: conversation.slice(1), ok: true };
  } catch (error) {
    console.error('Erro no motor da Sofia:', error);
    return { reply: fallbackReply(siteConfig), historico: historico || [], ok: false };
  }
}
