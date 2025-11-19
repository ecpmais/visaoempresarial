import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Edit, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

const questions = [
  "Qual é o segmento de negócio em que você está inserido?",
  "O que sua empresa faz?",
  "Esse segmento é um business de quê?",
  "Quem é o público-alvo da sua empresa?",
  "Onde você vê sua empresa em 3 a 5 anos?",
  "Para qual direção deseja apontar seus esforços?",
  "Como você medirá o sucesso da sua empresa?",
  "Se você saísse na capa da Forbes, qual seria a matéria?",
  "Quando imagina sua empresa alcançando a visão, qual imagem vem à mente?",
  "Das respostas acima, quais palavras-chave se repetem e têm mais significado?"
];

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; company_name: string } | null>(null);

  useEffect(() => {
    loadSession();
  }, [user]);

  const loadSession = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const sessionIdFromState = location.state?.sessionId;

    if (!sessionIdFromState) {
      navigate("/dashboard");
      return;
    }

    setSessionId(sessionIdFromState);

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    // CRITICAL: Validate that all 10 responses exist before loading
    const { count, error: countError } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionIdFromState);

    if (countError) {
      console.error('Error checking responses:', countError);
      toast.error('Erro ao verificar respostas');
      navigate("/wizard", { state: { sessionId: sessionIdFromState } });
      return;
    }

    if (count !== 10) {
      toast.error(`Complete todas as 10 perguntas primeiro. Você respondeu ${count} de 10.`);
      navigate("/wizard", { state: { sessionId: sessionIdFromState } });
      return;
    }

    // Load all responses
    const { data, error } = await supabase
      .from('responses')
      .select('question_number, answer_text')
      .eq('session_id', sessionIdFromState)
      .order('question_number');

    if (error) {
      console.error('Error loading responses:', error);
      toast.error('Erro ao carregar respostas');
      navigate("/wizard", { state: { sessionId: sessionIdFromState } });
      return;
    }

    const loadedAnswers: Record<number, string> = {};
    data?.forEach((response) => {
      loadedAnswers[response.question_number] = response.answer_text;
    });
    setAnswers(loadedAnswers);
    setLoading(false);
  };

  const handleEdit = (questionNumber: number) => {
    navigate("/wizard", { state: { sessionId, editQuestion: questionNumber } });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    // Check if all questions are answered
    const missingAnswers = [];
    for (let i = 1; i <= 10; i++) {
      if (!answers[i] || !answers[i].trim()) {
        missingAnswers.push(i);
      }
    }

    if (missingAnswers.length > 0) {
      toast.error(`Por favor, responda as perguntas: ${missingAnswers.join(', ')}`);
      return;
    }

    setIsGenerating(true);
    navigate("/processing", { state: { sessionId } });
  };

  const handleBack = () => {
    navigate("/wizard", { state: { sessionId } });
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const userInitials = profile?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || "U";

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando respostas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h1 className="text-xl font-bold">Revisão Final</h1>
              <p className="text-xs text-muted-foreground">Confira suas respostas</p>
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
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">📋 Revisão de Respostas</CardTitle>
            <p className="text-muted-foreground">
              Revise suas respostas antes de gerar a análise. Você pode editar qualquer resposta clicando no botão "Editar".
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => {
              const questionNumber = index + 1;
              const answer = answers[questionNumber];
              const hasAnswer = answer && answer.trim();

              return (
                <div key={questionNumber}>
                  {questionNumber > 1 && <Separator className="mb-6" />}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                            {questionNumber}
                          </span>
                          <h3 className="font-semibold text-sm">{question}</h3>
                        </div>
                        {hasAnswer ? (
                          <p className="text-sm text-muted-foreground pl-9 whitespace-pre-wrap">
                            {answer}
                          </p>
                        ) : (
                          <p className="text-sm text-destructive pl-9 italic">
                            Pergunta não respondida
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(questionNumber)}
                        className="flex-shrink-0"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button 
            onClick={handleGenerate} 
            className="bg-primary hover:bg-primary/90"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Iniciando...
              </>
            ) : (
              <>
                Gerar Análise
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
