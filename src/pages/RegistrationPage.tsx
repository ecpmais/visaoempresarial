import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

const registrationSchema = z.object({
  userName: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  companyName: z.string().trim().min(1, "Nome da empresa é obrigatório").max(100, "Nome da empresa deve ter no máximo 100 caracteres")
});

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      const validation = registrationSchema.safeParse({ userName, companyName });
      if (!validation.success) {
        const error = validation.error.errors[0];
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Gerar session token único
      const sessionToken = crypto.randomUUID();

      // Criar sessão via Edge Function
      const { data, error } = await supabase.functions.invoke('process-responses', {
        body: {
          action: 'create-session',
          user_name: validation.data.userName,
          company_name: validation.data.companyName,
          session_token: sessionToken
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar sessão');
      }

      // Salvar no localStorage
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('user_name', validation.data.userName);
      localStorage.setItem('company_name', validation.data.companyName);
      localStorage.setItem('session_id', data.session_id);

      toast.success(`Bem-vindo, ${validation.data.userName}!`);
      navigate("/wizard");
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      toast.error(error.message || "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-2 animate-in fade-in slide-in-from-bottom">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">EP</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Bem-vindo ao Criador de Visão
          </CardTitle>
          <CardDescription className="text-center">
            Preencha seus dados para começar a jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome</Label>
              <Input
                id="userName"
                type="text"
                placeholder="Seu nome completo"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                disabled={loading}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Nome da sua empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
                maxLength={100}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && <Sparkles className="mr-2 h-4 w-4" />}
              Começar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationPage;
