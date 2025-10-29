/**
 * EDGE FUNCTION: process-responses
 * 
 * Processa respostas do usuário para gerar declarações de visão empresarial
 * usando IA (Google Gemini 2.5 Flash).
 * 
 * AÇÕES DISPONÍVEIS:
 * - analyze: Cria visões iniciais a partir das 10 respostas
 * - rewrite: Reescreve visões existentes (shorter, more_options, shorter_term)
 * 
 * CONTEXTO ESTRATÉGICO:
 * A IA é instruída com conhecimento profundo sobre:
 * - Tipos de visão (inspiracional vs mensurável)
 * - Exemplos reais de empresas (Amazon, Harvard, Virtus, etc.)
 * - Regras fundamentais (foco no "ONDE", 8-14 palavras, 2 linhas)
 * - Análise de frequência de palavras e posicionamento estratégico
 * 
 * PALAVRAS-CHAVE: Uso máximo com flexibilidade gramatical
 * IMAGEM MENTAL: Inspiração emocional da pergunta 9
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, action, mode, user_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!session_id || !user_id) {
      throw new Error("session_id and user_id are required");
    }

    // Verify that the session belongs to the user
    const { data: session, error: sessionCheckError } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (sessionCheckError || !session) {
      throw new Error("Session not found or unauthorized");
    }

    if (action === "analyze") {
      console.log("=== ANÁLISE DE VISÃO INICIADA ===");
      console.log("Session ID:", session_id);
      console.log("Timestamp:", new Date().toISOString());
      
      // Load all 10 responses
      const { data: responses, error: responsesError } = await supabase
        .from("responses")
        .select("*")
        .eq("session_id", session_id)
        .order("question_number");

      if (responsesError) throw responsesError;

      if (!responses || responses.length !== 10) {
        return new Response(
          JSON.stringify({ error: "Todas as 10 perguntas devem ser respondidas" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("Total de respostas:", responses.length);

      // Build context from responses
      const questions = [
        "Segmento de negócio",
        "Principal produto/serviço",
        "Diferencial competitivo",
        "Problema que resolve",
        "Cliente ideal",
        "Valores fundamentais",
        "Objetivos de curto prazo",
        "Objetivos de longo prazo",
        "Imagem mental do futuro da empresa",
        "Palavras-chave que representam a essência da empresa"
      ];

      let contextString = "# RESPOSTAS DO CLIENTE:\n\n";
      responses.forEach((response, index) => {
        contextString += `${index + 1}. ${questions[index]}: ${response.answer_text}\n`;
      });

      // Log das perguntas mais importantes para análise
      console.log("Palavras-chave (Q10):", responses[9]?.answer_text);
      console.log("Imagem mental (Q9):", responses[8]?.answer_text);

      // Adicionar análise de frequência de palavras
      contextString += "\n# INSTRUÇÕES ADICIONAIS:\n";
      contextString += "- Preste atenção especial às palavras que se repetem nas respostas acima\n";
      contextString += "- As palavras da pergunta 10 devem ser PRIORIZADAS na construção da visão\n";
      contextString += "- A imagem mental da pergunta 9 deve inspirar o tom emocional da visão\n";
      contextString += "- Identifique o posicionamento estratégico (especialista vs generalista)\n\n";
      contextString += "Agora, com base nessas informações, crie as duas declarações de visão (inspiracional e mensurável).";

      const systemPrompt = `Você é um especialista em Cultura Organizacional e Planejamento Estratégico, focado em criar DECLARAÇÕES DE VISÃO EMPRESARIAL.

# CONTEXTO FUNDAMENTAL

## O que é Visão Empresarial?
Visão empresarial deve ser grandiosa, inspiradora e estratégica para:
- Guiar o planejamento estratégico da empresa
- Atrair e reter talentos alinhados com o propósito
- Dar direção, norte, destino e foco
- Posicionar estrategicamente a empresa no mercado

Visão é o que a empresa busca no FUTURO, é um DESTINO, é o "ONDE" a empresa quer chegar.
O poder da visão é que as pessoas ficam dispostas a apoiá-la quando percebem que ela converge com seus objetivos individuais.

## Tipos de Visão

1. **INSPIRACIONAL** (mais comum):
   - Não contém métricas
   - Busca inspirar e motivar as ações da empresa
   - Exemplos:
     * Amazon: "Ser a empresa mais centrada no cliente da terra"
       → Foco: cliente como prioridade absoluta (nichamento comportamental)
     * Harvard: "Ser referência em educação para líderes no mundo, para o benefício da humanidade"
       → Foco: especialização (líderes) + impacto global
     * Virtus: "Ser referência em qualidade e satisfação do cliente no ramo de GALPÕES"
       → Foco: especialista (não generalista) + diferenciação (não preço baixo)
     * Google: "Ser o buscador de maior prestígio e o mais importante do mundo"
     * Netflix: "Continuar sendo uma das empresas líderes da era do entretenimento na internet"
     * Meta: "Construir uma comunidade global e conectar o mundo"
     * Apple: "Fazer os melhores produtos do mundo e deixar o mundo melhor do que encontramos"

2. **MENSURÁVEL**:
   - Possui métrica quantificável
   - Define metas específicas e prazos
   - Exemplos:
     * "Levar saúde e beleza para 1MM de pessoas até 2025"
     * "Estar entre as 100 maiores construtoras do BR até 2026"
     * "Criar a mais grandiosa comunidade de empresas com propósito do Mundo - #Rumoàs10k"

# REGRAS OBRIGATÓRIAS PARA A DECLARAÇÃO DE VISÃO

## ❌ O QUE NÃO FAZER:
- NUNCA descrever "O QUE" a empresa faz (produtos/serviços)
- NUNCA descrever "COMO" a empresa opera (processos/métodos)
- NUNCA ultrapassar 2 linhas ou 14 palavras

## ✅ O QUE FAZER:
- Focar SEMPRE no "ONDE" a empresa quer chegar (destino/direção)
- Máximo de 2 linhas e **8 a 14 palavras NO TOTAL**
- Tom profissional, inspirador e estratégico
- Refletir o impacto que a empresa deseja causar no mundo

# PROCESSO DE ANÁLISE

## 1. Análise de Frequência e Significado:
- Analise TODAS as 10 respostas do cliente
- Identifique palavras que SE REPETEM ao longo das respostas
- Determine quais palavras têm MAIOR SIGNIFICADO estratégico para o cliente
- Essas palavras revelam os valores e direcionamentos mais importantes

## 2. Uso CRÍTICO das Palavras-Chave (Pergunta 10):
- Extraia TODAS as palavras-chave da pergunta 10 (sem limite de quantidade)
- Use o MÁXIMO POSSÍVEL destas palavras nas declarações de visão
- Permita adaptações gramaticais naturais:
  * Singular ↔ Plural (ex: "empresa" → "empresas")
  * Verbo ↔ Substantivo (ex: "criar" → "criação", "transformar" → "transformação")
  * Gênero (ex: "grandioso" → "grandiosa")
  * Tempo verbal (ex: "transformando" → "transformar")
- Priorize incorporação NATURAL e INSPIRADORA das palavras-chave

## 3. Imagem Mental (Pergunta 9):
- Use a imagem mental descrita para adicionar elementos visuais/emocionais à visão
- A imagem deve complementar as palavras-chave de forma coerente

## 4. Posicionamento Estratégico:
- Identifique se a empresa busca ser ESPECIALISTA (nicho específico) ou GENERALISTA
- Determine o diferencial competitivo (qualidade, inovação, cliente, preço, etc.)
- Reflita o nichamento e competitividade na declaração de visão

# FORMATO DE SAÍDA

Retorne um JSON puro (sem markdown) com:
- "vision_inspirational": string (8-14 palavras, sem métricas, inspiradora)
- "vision_measurable": string (8-14 palavras, com métrica ou meta quantificável)
- "keywords": array com TODAS as palavras-chave da pergunta 10
- "insights": array com 2-3 insights curtos sobre o perfil estratégico
- "notes": string com observação concisa sobre o posicionamento estratégico identificado

**LEMBRE-SE**: As declarações devem focar no IMPACTO que a empresa quer causar e no DESTINO que ela busca alcançar, não nas atividades que ela realiza.`;

      const userPrompt = contextString;

      const startTime = Date.now();

      // Call Lovable AI
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errorText);
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from AI");
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

      const elapsedTime = Date.now() - startTime;

      // Validar tamanho das visões
      const validateVisionLength = (vision: string, type: string) => {
        const wordCount = vision.trim().split(/\s+/).length;
        if (wordCount < 8 || wordCount > 14) {
          console.warn(`[AVISO] ${type} tem ${wordCount} palavras (ideal: 8-14)`);
        }
        
        const lineCount = vision.split('\n').length;
        if (lineCount > 2) {
          console.warn(`[AVISO] ${type} tem ${lineCount} linhas (máximo: 2)`);
        }
      };

      validateVisionLength(result.vision_inspirational, "Visão Inspiracional");
      validateVisionLength(result.vision_measurable, "Visão Mensurável");

      console.log("=== RESULTADO DA IA ===");
      console.log("Visão Inspiracional:", result.vision_inspirational);
      console.log("Visão Mensurável:", result.vision_measurable);
      console.log("Total de keywords extraídas:", result.keywords?.length || 0);
      console.log("Keywords:", result.keywords);
      console.log(`Análise completada em ${elapsedTime}ms`);

      // Save analysis with version history
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          session_id,
          vision_inspirational: result.vision_inspirational,
          vision_measurable: result.vision_measurable,
          meta: {
            keywords: result.keywords || [],
            insights: result.insights || [],
            notes: result.notes || "",
            processing_time_ms: elapsedTime,
            version_history: [
              {
                type: "original",
                timestamp: new Date().toISOString(),
                vision_inspirational: result.vision_inspirational,
                vision_measurable: result.vision_measurable
              }
            ]
          }
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      return new Response(
        JSON.stringify({ 
          success: true,
          analysis_id: analysis.id,
          processing_time_ms: elapsedTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "rewrite") {
      console.log(`[${new Date().toISOString()}] Rewriting for session: ${session_id}, mode: ${mode}`);

      // Get latest analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (analysisError) throw analysisError;

      let rewritePrompt = "";

      if (mode === "shorter") {
        rewritePrompt = `Reescreva as seguintes visões de forma MAIS CURTA (máx 8-10 palavras cada):

Inspiracional: ${analysis.vision_inspirational}
Mensurável: ${analysis.vision_measurable}

Retorne JSON:
{
  "vision_inspirational": "versão mais curta",
  "vision_measurable": "versão mais curta"
}`;
      } else if (mode === "more_options") {
        rewritePrompt = `Crie 3 VARIAÇÕES de cada visão abaixo (mantendo essência e palavras-chave):

Original Inspiracional: ${analysis.vision_inspirational}
Original Mensurável: ${analysis.vision_measurable}

Retorne JSON:
{
  "vision_inspirational": "melhor variação inspiracional",
  "vision_measurable": "melhor variação mensurável",
  "variations": {
    "inspirational": ["var1", "var2", "var3"],
    "measurable": ["var1", "var2", "var3"]
  }
}`;
      } else if (mode === "shorter_term") {
        rewritePrompt = `Adapte as visões para CURTO PRAZO (1-2 anos):

Inspiracional: ${analysis.vision_inspirational}
Mensurável: ${analysis.vision_measurable}

Retorne JSON:
{
  "vision_inspirational": "versão curto prazo",
  "vision_measurable": "versão curto prazo"
}`;
      }

      const startTime = Date.now();

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um especialista em Visão Empresarial. Retorne apenas JSON puro." },
            { role: "user", content: rewritePrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

      const elapsedTime = Date.now() - startTime;

      // Add to version history instead of overwriting
      const versionHistory = analysis.meta?.version_history || [];
      
      const newVersion: any = {
        type: mode,
        timestamp: new Date().toISOString(),
        vision_inspirational: result.vision_inspirational,
        vision_measurable: result.vision_measurable,
        processing_time_ms: elapsedTime
      };

      if (result.variations) {
        newVersion.variations = result.variations;
      }

      versionHistory.push(newVersion);

      const updatedMeta = {
        ...analysis.meta,
        version_history: versionHistory
      };

      const { error: updateError } = await supabase
        .from("analyses")
        .update({ meta: updatedMeta })
        .eq("id", analysis.id);

      if (updateError) throw updateError;

      console.log(`[${new Date().toISOString()}] Rewrite completed in ${elapsedTime}ms`);

      return new Response(
        JSON.stringify({ 
          success: true,
          processing_time_ms: elapsedTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});