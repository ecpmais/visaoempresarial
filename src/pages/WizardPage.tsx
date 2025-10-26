import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Trash2, Sparkles, LogOut } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const currentAnswer = answers[currentStep] || "";
  const debouncedAnswer = useDebounce(currentAnswer, 500);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await loadOrCreateSession(session.user.id);
  };

  const loadOrCreateSession = async (userId: string) => {
    try {
      // Try to load existing session
      const { data: existingSessions, error: fetchError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        setSessionId(session.id);
        setCurrentStep(session.stage);
        await loadResponses(session.id);
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("sessions")
          .insert({ user_id: userId, stage: 1 })
          .select()
          .single();

        if (createError) throw createError;
        setSessionId(newSession.id);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar sessão: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("responses")
        .select("*")
        .eq("session_id", sessionId);

      if (error) throw error;

      const answersMap: Record<number, string> = {};
      data.forEach(response => {
        answersMap[response.question_number] = response.answer_text;
      });
      setAnswers(answersMap);
    } catch (error: any) {
      console.error("Error loading responses:", error);
    }
  };

  useEffect(() => {
    if (sessionId && debouncedAnswer) {
      saveAnswer();
    }
  }, [debouncedAnswer]);

  const saveAnswer = async () => {
    if (!sessionId || !debouncedAnswer.trim()) return;

    try {
      const { error } = await supabase
        .from("responses")
        .upsert({
          session_id: sessionId,
          question_number: currentStep,
          answer_text: debouncedAnswer
        }, {
          onConflict: "session_id,question_number"
        });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving answer:", error);
    }
  };

  const updateStage = async (newStage: number) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from("sessions")
        .update({ stage: newStage })
        .eq("id", sessionId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating stage:", error);
    }
  };

  const handleNext = async () => {
    if (!currentAnswer.trim()) {
      toast.error("Por favor, responda a pergunta atual antes de continuar.");
      return;
    }

    await saveAnswer();

    if (currentStep < 10) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateStage(nextStep);
    } else {
      // All questions answered, go to processing
      navigate("/processing", { state: { sessionId } });
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      await updateStage(prevStep);
    }
  };

  const handleClear = () => {
    setAnswers(prev => ({ ...prev, [currentStep]: "" }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const progress = (currentStep / 10) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
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

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pergunta {currentStep} de 10</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="shadow-xl border-2 animate-in fade-in slide-in-from-bottom">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold leading-tight">
                {questions[currentStep - 1]}
              </h2>
              
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
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar resposta
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
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
                {currentStep === 10 ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar Respostas
                  </>
                ) : (
                  <>
                    Avançar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stepper Indicator */}
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
                  : step < currentStep
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