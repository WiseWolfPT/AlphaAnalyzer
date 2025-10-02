// Wave 4: Modern Registration Page for Portuguese Investors
import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthMonitoring } from '@/hooks/use-auth-monitoring';
import { Chrome, Eye, EyeOff, TrendingUp, Shield } from 'lucide-react';

// Form validation schema for Portuguese users
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .min(1, 'Nome é obrigatório'),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(8, 'Password deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password deve conter pelo menos: 1 minúscula, 1 maiúscula, 1 número'),
  preferred_currency: z.enum(['EUR', 'USD']),
  preferred_region: z.enum(['EU', 'USA']),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Deve aceitar os termos e condições'
  })
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const auth = useAuthMonitoring();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      preferred_currency: 'EUR', // Default for Portuguese users
      preferred_region: 'EU',
      terms_accepted: false,
    },
  });

  // Handle form submission
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auth.signUp(data.email, data.password, {
        name: data.name,
        preferred_currency: data.preferred_currency,
        preferred_region: data.preferred_region,
        preferred_language: 'pt'
      });
      
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
        // Note: User will need to confirm email before login
      }
    } catch (error: any) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign up
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auth.signInWithGoogle();
      
      if (result.error) {
        setError(result.error.message);
      }
      // Note: Google OAuth will redirect automatically
    } catch (error: any) {
      setError('Erro no registo com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-teya-green/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-teya-green" />
            </div>
            <CardTitle className="text-2xl">Conta Criada! 🎉</CardTitle>
            <CardDescription>
              Verifique o seu email para ativar a conta
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviámos um email de confirmação para <strong>{form.getValues('email')}</strong>.
              Clique no link para ativar a sua conta.
            </p>
            <Button 
              onClick={() => setLocation('/auth/login')}
              className="w-full"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teya-green/10 to-teya-green/5 flex-col justify-center px-12">
        <div className="max-w-lg">
          <div className="flex items-center space-x-2 mb-8">
            <TrendingUp className="h-8 w-8 text-teya-green" />
            <span className="text-2xl font-bold">Alfalyzer</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-6">
            Comece a investir nos
            <span className="text-teya-green"> mercados globais</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Junte-se a milhares de investidores portugueses que acedem aos mercados
            americanos e europeus com ferramentas profissionais.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teya-green rounded-full"></div>
              <span>Conta gratuita com funcionalidades básicas</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teya-green rounded-full"></div>
              <span>Configuração automática para mercado português</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teya-green rounded-full"></div>
              <span>Interface em português, dados em EUR/USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Criar Conta Gratuita
            </CardTitle>
            <CardDescription className="text-center">
              Acesso aos mercados globais em 2 minutos
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google Sign Up */}
            <Button
              variant="outline"
              onClick={handleGoogleSignUp}
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
                  Ou criar com email
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="João Silva"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="joao@exemplo.com"
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
                            placeholder="Mínimo 8 caracteres"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preferred_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda Principal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferred_region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mercado Foco</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EU">Europa</SelectItem>
                            <SelectItem value="USA">Estados Unidos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="terms_accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Aceito os{' '}
                          <Link href="/terms-of-service">
                            <Button variant="link" className="px-1 h-auto font-normal text-sm">
                              Termos e Condições
                            </Button>
                          </Link>{' '}
                          e{' '}
                          <Link href="/privacy-policy">
                            <Button variant="link" className="px-1 h-auto font-normal text-sm">
                              Política de Privacidade
                            </Button>
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'A criar conta...' : 'Criar Conta Gratuita'}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link href="/auth/login">
                <Button variant="link" className="px-1 font-normal">
                  Fazer login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
