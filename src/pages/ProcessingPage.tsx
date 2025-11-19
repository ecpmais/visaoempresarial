import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

const ProcessingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const sessionId = location.state?.sessionId;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }
    
    analyzeResponses();
  }, [sessionId, user, navigate]);

  const analyzeResponses = async (attempt = 1) => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      if (attempt < 3) {
        console.log(`Timeout reached. Retrying (attempt ${attempt + 1}/3)...`);
        toast.error("Processamento demorado. Tentando novamente...");
        analyzeResponses(attempt + 1);
      } else {
        console.error('Max retries reached');
        toast.error("Tempo esgotado após 3 tentativas. Tente novamente mais tarde.");
        navigate('/review', { state: { sessionId } });
      }
    }, 60000); // 60 seconds timeout

    try {
      const { data, error } = await supabase.functions.invoke('process-responses', {
        body: { 
          action: 'analyze',
          session_id: sessionId,
          user_id: user.id
        }
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      toast.success('Análise concluída!');
      navigate('/summary', { state: { sessionId } });
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error analyzing responses:', error);
      
      // Retry on error
      if (attempt < 3) {
        console.log(`Error occurred. Retrying (attempt ${attempt + 1}/3)...`);
        toast.error("Erro no processamento. Tentando novamente...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        analyzeResponses(attempt + 1);
      } else {
        toast.error(error.message || 'Erro ao processar respostas após 3 tentativas');
        navigate('/review', { state: { sessionId } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col items-center justify-center p-4 gap-8">
      <Logo size="lg" className="animate-pulse" />
      
      <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-primary/20 rounded-full animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-primary animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Analisando suas respostas...</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nossa IA está processando suas informações para criar declarações de visão inspiradoras e mensuráveis.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 animate-pulse" />
          <span>Identificando palavras-chave e padrões...</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessingPage;
