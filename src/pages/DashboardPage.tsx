import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, LogOut, Trash2, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

interface SessionWithAnalysis {
  id: string;
  stage: number;
  created_at: string;
  updated_at: string;
  hasAnalysis: boolean;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; company_name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Load sessions
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id, stage, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (sessionsData) {
        // Check which sessions have analyses
        const sessionsWithAnalyses = await Promise.all(
          sessionsData.map(async (session) => {
            const { data: analysis } = await supabase
              .from("analyses")
              .select("id")
              .eq("session_id", session.id)
              .maybeSingle();

            return {
              ...session,
              hasAnalysis: !!analysis
            };
          })
        );

        setSessions(sessionsWithAnalyses);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    if (!user) return;

    try {
      const { data: newSession, error } = await supabase
        .from("sessions")
        .insert({ user_id: user.id, stage: 1 })
        .select()
        .single();

      if (error) throw error;

      navigate("/wizard", { state: { sessionId: newSession.id } });
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar nova análise"
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: "Análise excluída",
        description: "A análise foi removida com sucesso"
      });

      loadData();
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a análise"
      });
    }
  };

  const getSessionStatus = (session: SessionWithAnalysis) => {
    if (session.hasAnalysis) return { label: "Completa", variant: "default" as const };
    if (session.stage >= 10) return { label: "Em revisão", variant: "secondary" as const };
    return { label: "Em andamento", variant: "outline" as const };
  };

  const handleSessionAction = (session: SessionWithAnalysis) => {
    if (session.hasAnalysis) {
      navigate("/summary", { state: { sessionId: session.id } });
    } else if (session.stage >= 10) {
      navigate("/review", { state: { sessionId: session.id } });
    } else {
      navigate("/wizard", { state: { sessionId: session.id } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {profile?.full_name || user?.email}
          </p>
        </div>

        {/* Profile Card */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Seu Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Nome:</span> {profile.full_name}
              </div>
              <div>
                <span className="font-medium">Empresa:</span> {profile.company_name}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Session Button */}
        <Button onClick={handleNewSession} size="lg" className="w-full">
          <Plus className="mr-2 h-5 w-5" />
          Nova Análise de Visão
        </Button>

        {/* Sessions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Suas Análises</h2>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Você ainda não criou nenhuma análise
                </p>
                <Button onClick={handleNewSession}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira análise
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sessions.map((session) => {
                const status = getSessionStatus(session);
                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Análise {new Date(session.created_at).toLocaleDateString()}
                        </CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <CardDescription>
                        Última atualização: {new Date(session.updated_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSessionAction(session)}
                          className="flex-1"
                        >
                          {session.hasAnalysis ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Resultado
                            </>
                          ) : (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Continuar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
