import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      // Use production URL for password reset to avoid localhost issues
      const redirectUrl = window.location.hostname === 'localhost'
        ? 'https://128.140.45.28.sslip.io/auth/reset-password'
        : `${window.location.origin}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setMessage('Enviámos um email com instruções para redefinir a sua password.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar password</CardTitle>
          <CardDescription>Introduza o seu email para receber um link de recuperação.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="o.seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'A enviar…' : 'Enviar link de recuperação'}
            </Button>
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

