// Wave 4: Modern Login Page with Supabase Auth
// Optimized for Portuguese investors
import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthMonitoring } from '@/hooks/use-auth-monitoring';
import { Chrome, Eye, EyeOff, TrendingUp } from 'lucide-react';

// Form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(6, 'Password deve ter pelo menos 6 caracteres')
    .min(1, 'Password é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuthMonitoring();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auth.signIn(data.email, data.password);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        // Redirect to dashboard on success
        setLocation('/dashboard');
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auth.signInWithGoogle();
      
      if (result.error) {
        setError(result.error.message);
      }
      // Note: Google OAuth will redirect automatically
    } catch (error: any) {
      setError('Erro no login com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-chartreuse/10 to-chartreuse/5 flex-col justify-center px-12">
        <div className="max-w-lg">
          <div className="flex items-center space-x-2 mb-8">
            <TrendingUp className="h-8 w-8 text-chartreuse" />
            <span className="text-2xl font-bold">Alfalyzer</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-6">
            Mercados USA & EU para
            <span className="text-chartreuse"> Investidores Portugueses</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Acesso profissional aos mercados internacionais com análise em tempo real,
            portfolio tracking e conversão automática EUR/USD.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-chartreuse rounded-full"></div>
              <span>Dados em tempo real de NYSE, NASDAQ, Euronext</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-chartreuse rounded-full"></div>
              <span>Portfolio P&L automático com conversão EUR/USD</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-chartreuse rounded-full"></div>
              <span>Análise fundamental de empresas americanas e europeias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Entrar na Alfalyzer
            </CardTitle>
            <CardDescription className="text-center">
              Acesse a sua conta de investimento
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google Sign In */}
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continuar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu.email@exemplo.com"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            disabled={isLoading}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <Link href="/auth/forgot-password">
                    <Button variant="link" className="px-0 font-normal">
                      Esqueceu a password?
                    </Button>
                  </Link>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'A entrar...' : 'Entrar'}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link href="/auth/register">
                <Button variant="link" className="px-1 font-normal">
                  Criar conta grátis
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}