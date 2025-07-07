import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
    } else {
      // Redirect to dashboard on success
      window.location.href = "/find-stocks";
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("Google Sign-In não disponível em modo demo");
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Por favor, insira o seu email primeiro");
      return;
    }
    
    setError("Recuperação de password não disponível em modo demo. Use beta@alfalyzer.com / 123demo");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-chartreuse-dark to-chartreuse rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Alpha Analyzer</h1>
          </div>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Faça login na sua conta.
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-center">Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Beta Demo Credentials */}
              <Alert className="border-chartreuse/50 bg-chartreuse/10">
                <AlertDescription className="text-chartreuse-dark">
                  <strong>Credenciais Beta:</strong><br />
                  Email: beta@alfalyzer.com<br />
                  Password: 123demo
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              {resetEmailSent && (
                <Alert className="border-chartreuse/50 bg-chartreuse/10">
                  <AlertDescription className="text-chartreuse-dark">
                    Email de recuperação enviado! Verifique a sua caixa de entrada.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black font-semibold"
                  disabled={loading}
                >
                  {loading ? "A fazer login..." : "Fazer Login"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm text-chartreuse hover:text-chartreuse-dark underline"
                  disabled={loading}
                >
                  Esqueceu-se da password?
                </button>
                
                <p className="text-sm text-muted-foreground">
                  Não tem conta?{" "}
                  <a href="/register" className="text-chartreuse hover:text-chartreuse-dark underline">
                    Registar-se
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Back to Landing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-6"
        >
          <Button
            variant="ghost"
            onClick={() => window.location.href = "/"}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à página inicial
          </Button>
        </motion.div>
      </div>
    </div>
  );
}