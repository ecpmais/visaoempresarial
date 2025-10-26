import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  FileText, 
  Download, 
  RefreshCw,
  Star,
  Home
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Analysis {
  id: string;
  vision_inspirational: string;
  vision_measurable: string;
  meta: {
    keywords?: string[];
    insights?: string[];
    notes?: string[];
  };
  created_at: string;
}

const SummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [favoriteVision, setFavoriteVision] = useState<'inspirational' | 'measurable' | null>(null);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    const storedUserName = localStorage.getItem('user_name');
    const storedCompanyName = localStorage.getItem('company_name');

    if (!sessionToken) {
      navigate('/auth');
      return;
    }

    setUserName(storedUserName || "");
    setCompanyName(storedCompanyName || "");

    if (sessionId) {
      loadAnalysis();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const loadAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setAnalysis(data as Analysis);
    } catch (error: any) {
      console.error('Error loading analysis:', error);
      toast.error('Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async (mode: 'shorter' | 'more_options' | 'shorter_term') => {
    if (!sessionId) return;
    
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      navigate('/auth');
      return;
    }

    setRewriteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-responses', {
        body: { 
          action: 'rewrite',
          session_id: sessionId,
          session_token: sessionToken,
          mode 
        }
      });

      if (error) throw error;

      toast.success('Visões reescritas com sucesso!');
      await loadAnalysis();
    } catch (error: any) {
      console.error('Error rewriting visions:', error);
      toast.error(error.message || 'Erro ao reescrever visões');
    } finally {
      setRewriteLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewAnalysis = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('company_name');
    navigate("/auth");
  };

  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Nenhuma análise encontrada.</p>
          <Button onClick={() => navigate('/wizard')}>
            Voltar ao Wizard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">EP</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Sua Visão Empresarial</h1>
              <p className="text-xs text-muted-foreground">Análise de: {userName} - {companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{companyName}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleNewAnalysis}>
              <Home className="h-4 w-4 mr-2" />
              Nova Análise
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-2 animate-in fade-in">
            <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Sua Visão Empresarial
            </h2>
            <p className="text-muted-foreground">
              Declarações criadas com base nas suas respostas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-left">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Visão Inspiracional
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFavoriteVision(favoriteVision === 'inspirational' ? null : 'inspirational')}
                  >
                    <Star className={`h-5 w-5 ${favoriteVision === 'inspirational' ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                <CardDescription>Sem métricas, focada em inspirar</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{analysis.vision_inspirational}</p>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-right">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Visão Mensurável
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFavoriteVision(favoriteVision === 'measurable' ? null : 'measurable')}
                  >
                    <Star className={`h-5 w-5 ${favoriteVision === 'measurable' ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                <CardDescription>Com métricas e resultados quantificáveis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{analysis.vision_measurable}</p>
              </CardContent>
            </Card>
          </div>

          {(analysis.meta?.keywords || analysis.meta?.insights || analysis.meta?.notes) && (
            <Card className="shadow-xl border-2 animate-in fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Análise Detalhada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.isArray(analysis.meta.keywords) && analysis.meta.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Palavras-chave identificadas:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.meta.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(analysis.meta.insights) && analysis.meta.insights.length > 0 && (
                  <div>
                    <Separator className="mb-4" />
                    <h4 className="font-semibold mb-3">Insights estratégicos:</h4>
                    <ul className="space-y-2">
                      {analysis.meta.insights.map((insight, index) => (
                        <li key={index} className="flex gap-2 text-muted-foreground">
                          <span className="text-primary font-bold">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(analysis.meta.notes) && analysis.meta.notes.length > 0 && (
                  <div>
                    <Separator className="mb-4" />
                    <h4 className="font-semibold mb-3">Notas importantes:</h4>
                    <ul className="space-y-2">
                      {analysis.meta.notes.map((note, index) => (
                        <li key={index} className="flex gap-2 text-muted-foreground">
                          <span className="text-primary font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-xl border-2 print:hidden">
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>Reescreva as visões ou exporte seus resultados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRewrite('shorter')}
                  disabled={rewriteLoading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${rewriteLoading ? 'animate-spin' : ''}`} />
                  Mais Curto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRewrite('more_options')}
                  disabled={rewriteLoading}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Mais Opções
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRewrite('shorter_term')}
                  disabled={rewriteLoading}
                  className="w-full"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Curto Prazo
                </Button>
              </div>

              <Separator />

              <div className="grid md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/wizard')}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Revisar Respostas
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleNewAnalysis}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Nova Análise
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
