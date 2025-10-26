import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Clock, 
  Star, 
  Printer,
  LogOut,
  Loader2
} from "lucide-react";

interface Analysis {
  id: string;
  vision_inspirational: string;
  vision_measurable: string;
  meta: {
    keywords?: string[];
    insights?: string[];
    notes?: string;
    variations?: any;
  };
}

const SummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;
  const analysisId = location.state?.analysisId;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [favoriteVision, setFavoriteVision] = useState<"inspirational" | "measurable" | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/wizard");
      return;
    }
    loadAnalysis();
  }, [sessionId, analysisId]);

  const loadAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setAnalysis(data as Analysis);
    } catch (error: any) {
      console.error("Error loading analysis:", error);
      toast.error("Erro ao carregar análise");
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async (mode: "shorter" | "more_options" | "shorter_term") => {
    if (!sessionId) return;
    
    setActionLoading(mode);
    try {
      const { data, error } = await supabase.functions.invoke("process-responses", {
        body: { session_id: sessionId, action: "rewrite", mode }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Visões reescritas com sucesso!");
      await loadAnalysis();
    } catch (error: any) {
      console.error("Error rewriting:", error);
      toast.error("Erro ao reescrever visões");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNewAnalysis = () => {
    navigate("/wizard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Nenhuma análise encontrada.</p>
          <Button onClick={() => navigate("/wizard")}>Voltar ao Wizard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 no-print">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">EP</span>
            </div>
            <span className="font-semibold text-lg">EP Partners</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Title */}
          <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom">
            <h1 className="text-3xl md:text-4xl font-bold">Sua Visão Empresarial</h1>
            <p className="text-muted-foreground">
              Declarações criadas com base nas suas respostas
            </p>
          </div>

          {/* Vision Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Inspirational Vision */}
            <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-left">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Visão Inspiracional</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFavoriteVision(
                      favoriteVision === "inspirational" ? null : "inspirational"
                    )}
                  >
                    <Star 
                      className={`h-5 w-5 ${
                        favoriteVision === "inspirational" 
                          ? "fill-accent text-accent" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold leading-relaxed">
                  {analysis.vision_inspirational}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Sem métricas, focada em inspirar e motivar
                </p>
              </CardContent>
            </Card>

            {/* Measurable Vision */}
            <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-right">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Visão Mensurável</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFavoriteVision(
                      favoriteVision === "measurable" ? null : "measurable"
                    )}
                  >
                    <Star 
                      className={`h-5 w-5 ${
                        favoriteVision === "measurable" 
                          ? "fill-accent text-accent" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold leading-relaxed">
                  {analysis.vision_measurable}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Com métricas e resultados quantificáveis
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Keywords & Insights */}
          {(analysis.meta.keywords || analysis.meta.insights) && (
            <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-bottom">
              <CardHeader>
                <CardTitle>Análise Detalhada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.meta.keywords && analysis.meta.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Palavras-chave identificadas:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.meta.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.meta.insights && analysis.meta.insights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Insights:</h4>
                    <ul className="space-y-2">
                      {analysis.meta.insights.map((insight, index) => (
                        <li key={index} className="text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.meta.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground italic">
                      {analysis.meta.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="shadow-xl border-2 no-print">
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleRewrite("shorter")}
                  disabled={actionLoading !== null}
                  className="w-full"
                >
                  {actionLoading === "shorter" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Mais Curto
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleRewrite("more_options")}
                  disabled={actionLoading !== null}
                  className="w-full"
                >
                  {actionLoading === "more_options" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Mais Opções
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleRewrite("shorter_term")}
                  disabled={actionLoading !== null}
                  className="w-full"
                >
                  {actionLoading === "shorter_term" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Curto Prazo
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate("/wizard")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Revisar Respostas
                </Button>

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>

                <Button
                  onClick={handleNewAnalysis}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
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