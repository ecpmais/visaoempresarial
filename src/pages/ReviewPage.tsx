import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Edit, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const sessionToken = localStorage.getItem('session_token');
    const storedSessionId = localStorage.getItem('session_id');
    const storedUserName = localStorage.getItem('user_name');
    const storedCompanyName = localStorage.getItem('company_name');

    if (!sessionToken || !storedSessionId) {
      navigate("/auth");
      return;
    }

    setSessionId(storedSessionId);
    setUserName(storedUserName || "");
    setCompanyName(storedCompanyName || "");

    // Load all responses
    const { data, error } = await supabase
      .from('responses')
      .select('question_number, answer_text')
      .eq('session_id', storedSessionId)
      .order('question_number');

    if (error) {
      console.error('Error loading responses:', error);
      toast.error('Erro ao carregar respostas');
      navigate("/wizard");
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
    navigate("/wizard", { state: { editQuestion: questionNumber } });
  };

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

    navigate("/processing", { state: { sessionId } });
  };

  const handleBack = () => {
    navigate("/wizard");
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
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">EP</span>
            </div>
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
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleGenerate} className="bg-primary hover:bg-primary/90">
            Gerar Análise
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
