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
    const { session_id, action, mode, user_name, company_name, session_token } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "create-session") {
      console.log(`[${new Date().toISOString()}] Creating session`);

      if (!user_name || !company_name || !session_token) {
        throw new Error("user_name, company_name, and session_token are required");
      }

      // Create session
      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({ session_token, user_id: null, stage: 1 })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          session_id: newSession.id,
          user_name: user_name.trim(),
          company_name: company_name.trim()
        });

      if (profileError) throw profileError;

      return new Response(
        JSON.stringify({ success: true, session_id: newSession.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!session_id) {
      throw new Error("session_id is required");
    }

    if (action === "analyze") {
      console.log(`[${new Date().toISOString()}] Starting analysis for session: ${session_id}`);
      
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

      // Build context from responses
      const questions = [
        "Segmento de negócio",
        "O que a empresa faz",
        "Tipo de business",
        "Público-alvo",
        "Visão em 3-5 anos",
        "Direção dos esforços",
        "Medição de sucesso",
        "Matéria da Forbes",
        "Imagem da visão alcançada",
        "Palavras-chave repetidas"
      ];

      const contextLines = responses.map((r, i) => 
        `${i + 1}. ${questions[i]}: ${r.answer_text}`
      ).join("\n");

      const systemPrompt = `Você é um especialista em Cultura Organizacional e Planejamento Estratégico, focado em criar declarações de VISÃO EMPRESARIAL.

**REGRAS CRÍTICAS:**
1. Visão NUNCA descreve "O QUE" a empresa faz nem "COMO" ela faz
2. Visão é sobre "ONDE" a empresa quer chegar (destino, norte, direção)
3. Máximo 2 linhas e 8 a 14 palavras TOTAL
4. Use palavras repetidas e a imagem mental da pergunta 9
5. Tom profissional e inspirador

**TIPOS DE VISÃO:**
A) Inspiracional: sem métricas, foco em inspirar e motivar
B) Mensurável: com métrica quantificável ou resultado específico

Analise as respostas do usuário e retorne JSON puro (sem markdown):

{
  "vision_inspirational": "string (max 14 palavras)",
  "vision_measurable": "string (max 14 palavras)",
  "keywords": ["array de 3-5 palavras-chave"],
  "insights": ["array de 2-3 insights curtos"],
  "notes": "observação concisa sobre o perfil estratégico"
}`;

      const userPrompt = `Respostas do usuário:\n\n${contextLines}\n\nCrie as duas declarações de visão.`;

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
      console.log(`[${new Date().toISOString()}] Analysis completed in ${elapsedTime}ms`);

      // Save analysis
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
            processing_time_ms: elapsedTime
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

      // Update analysis with new versions
      const updatedMeta = {
        ...analysis.meta,
        [`${mode}_rewrite`]: result,
        [`${mode}_time_ms`]: elapsedTime
      };

      const { error: updateError } = await supabase
        .from("analyses")
        .update({
          vision_inspirational: result.vision_inspirational,
          vision_measurable: result.vision_measurable,
          meta: updatedMeta
        })
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