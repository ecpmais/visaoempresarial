import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, Workflow, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Target,
      title: "Processo Guiado",
      description: "10 perguntas estratégicas para mapear a essência do seu negócio e construir uma visão clara."
    },
    {
      icon: TrendingUp,
      title: "Recurso com IA Integrada",
      description: "Análise inteligente das suas respostas para gerar visões inspiradoras e mensuráveis."
    },
    {
      icon: Workflow,
      title: "Interações Práticas Finais",
      description: "Refine, ajuste e personalize sua visão com opções de reescrita e variações."
    }
  ];

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
          <Button 
            variant="outline" 
            onClick={() => navigate("/auth")}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Crie a Visão da sua{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              empresa
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Um processo guiado com IA para transformar seus insights em uma visão clara e inspiradora.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 mt-8"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-2 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 EP Partners. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;