import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eraser, Home } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/useAuth";

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

const WizardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; company_name: string } | null>(null);
  
  const debouncedAnswers = useDebounce(answers, 1000);

  // Load or create session
  const loadSession = async () => {
    if (!user) return;

    const sessionIdFromState = location.state?.sessionId;

    if (sessionIdFromState) {
      // Load existing session
      setSessionId(sessionIdFromState);
      await loadSessionData(sessionIdFromState);
    } else {
      // Create new session
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, stage: 1 })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast.error('Erro ao criar sessão');
        navigate("/dashboard");
        return;
      }

      setSessionId(newSession.id);
    }

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
  };

  const loadSessionData = async (sessionId: string) => {
    // Load session stage
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('stage')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error loading session:', sessionError);
      toast.error('Sessão inválida');
      navigate("/dashboard");
      return;
    }

    setCurrentStep(session.stage);
    await loadResponses(sessionId);
  };

  // Load existing responses
  const loadResponses = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('responses')
      .select('question_number, answer_text')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error loading responses:', error);
      return;
    }

    const loadedAnswers: Record<number, string> = {};
    data?.forEach((response) => {
      loadedAnswers[response.question_number] = response.answer_text;
    });
    setAnswers(loadedAnswers);
  };

  useEffect(() => {
    loadSession();
  }, [user]);

  // Save answer (debounced)
  useEffect(() => {
    if (sessionId && debouncedAnswers[currentStep]) {
      saveAnswer();
    }
  }, [debouncedAnswers, currentStep, sessionId]);

  const saveAnswer = async () => {
    if (!sessionId) return;
    
    const answer = debouncedAnswers[currentStep];
    if (!answer || !answer.trim()) return;

    try {
      const { error } = await supabase
        .from('responses')
        .upsert({
          session_id: sessionId,
          question_number: currentStep,
          answer_text: answer
        }, {
          onConflict: 'session_id,question_number'
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving answer:', error);
    }
  };

  const updateStage = async (newStage: number) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ stage: newStage })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating stage:', error);
    }
  };

  const handleNext = async () => {
    const currentAnswer = answers[currentStep];
    if (!currentAnswer || !currentAnswer.trim()) {
      toast.error("Por favor, responda a pergunta atual antes de continuar.");
      return;
    }

    await saveAnswer();

    if (currentStep < 10) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateStage(nextStep);
    } else {
      navigate("/review", { state: { sessionId } });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateStage(prevStep);
    }
  };

  const handleClear = () => {
    setAnswers(prev => ({ ...prev, [currentStep]: "" }));
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

  const progress = (currentStep / 10) * 100;
  const currentAnswer = answers[currentStep] || "";

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
              <h1 className="text-xl font-bold">Criador de Visão</h1>
              <p className="text-xs text-muted-foreground">Etapa {currentStep} de 10</p>
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

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pergunta {currentStep} de 10</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-bottom">
          <CardHeader>
            <CardTitle className="text-2xl">{questions[currentStep - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={currentAnswer}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentStep]: e.target.value }))}
                placeholder="Digite sua resposta aqui..."
                className="min-h-[200px] resize-none"
                maxLength={1000}
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{currentAnswer.length}/1000 caracteres</span>
                {currentAnswer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-destructive hover:text-destructive"
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleNext}
                className="bg-primary hover:bg-primary/90"
              >
                {currentStep === 10 ? "Revisar Respostas" : "Avançar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((step) => (
            <button
              key={step}
              onClick={() => {
                setCurrentStep(step);
                updateStage(step);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step === currentStep
                  ? "bg-primary text-primary-foreground scale-110"
                  : step < currentStep || answers[step]
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WizardPage;
