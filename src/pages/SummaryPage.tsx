import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  FileText, 
  Download, 
  RefreshCw,
  Star,
  Home,
  Copy,
  History,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/Logo";

interface VersionHistoryItem {
  type: string;
  timestamp: string;
  vision_inspirational: string;
  vision_measurable: string;
  processing_time_ms?: number;
  variations?: {
    inspirational?: string[];
    measurable?: string[];
  };
}

interface Analysis {
  id: string;
  vision_inspirational: string;
  vision_measurable: string;
  meta: {
    keywords?: string[];
    insights?: string[];
    notes?: string;
    version_history?: VersionHistoryItem[];
  };
  created_at: string;
}

const SummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const sessionId = location.state?.sessionId;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [favoriteVision, setFavoriteVision] = useState<'inspirational' | 'measurable' | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; company_name: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [user, sessionId]);

  const loadData = async () => {
    if (!user) return;

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    await loadAnalysis();
  };

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
    if (!sessionId || !user) return;

    setRewriteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-responses', {
        body: { 
          action: 'rewrite',
          session_id: sessionId,
          user_id: user.id,
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

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const copyToClipboard = (text: string, label: string = "Texto") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getVersionLabel = (type: string) => {
    switch (type) {
      case "original": return "✨ Versão Original";
      case "shorter": return "⚡ Versão Mais Curta";
      case "more_options": return "🎨 Versão Mais Opções";
      case "shorter_term": return "📅 Versão Curto Prazo";
      default: return `🔄 ${type}`;
    }
  };

  const userInitials = profile?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || "U";

  if (loading || !profile) {
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
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
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
            <Logo size="md" />
            <div>
              <h1 className="text-xl font-bold">Sua Visão Empresarial</h1>
              <p className="text-xs text-muted-foreground">Análise de: {profile.full_name} - {profile.company_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.company_name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleBackToDashboard}>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
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

                {analysis.meta.notes && typeof analysis.meta.notes === 'string' && analysis.meta.notes.trim() && (
                  <div>
                    <Separator className="mb-4" />
                    <h4 className="font-semibold mb-3">Notas importantes:</h4>
                    <p className="text-muted-foreground">{analysis.meta.notes}</p>
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
                  onClick={() => navigate('/review', { state: { sessionId } })}
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
                  onClick={handleBackToDashboard}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {analysis.meta?.version_history && analysis.meta.version_history.length > 1 && (
            <Card className="shadow-xl border-2 print:hidden animate-in fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de Versões
                </CardTitle>
                <CardDescription>
                  Todas as variações geradas ficam salvas aqui. Você pode copiar qualquer versão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {analysis.meta.version_history.map((version, index) => (
                  <div key={index}>
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">{getVersionLabel(version.type)}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(version.timestamp)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                Visão Inspiracional
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(version.vision_inspirational, "Visão inspiracional")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{version.vision_inspirational}</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-muted/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Visão Mensurável
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(version.vision_measurable, "Visão mensurável")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{version.vision_measurable}</p>
                          </CardContent>
                        </Card>

                        {version.variations && (
                          <Card className="bg-accent/10">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">Variações Adicionais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {version.variations.inspirational && version.variations.inspirational.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Variações Inspiracionais:</p>
                                  <ul className="space-y-2">
                                    {version.variations.inspirational.map((variation, vIdx) => (
                                      <li key={vIdx} className="flex items-start justify-between gap-2 text-sm">
                                        <span className="flex-1">{vIdx + 1}. {variation}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(variation, `Variação ${vIdx + 1}`)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {version.variations.measurable && version.variations.measurable.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Variações Mensuráveis:</p>
                                  <ul className="space-y-2">
                                    {version.variations.measurable.map((variation, vIdx) => (
                                      <li key={vIdx} className="flex items-start justify-between gap-2 text-sm">
                                        <span className="flex-1">{vIdx + 1}. {variation}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(variation, `Variação ${vIdx + 1}`)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
