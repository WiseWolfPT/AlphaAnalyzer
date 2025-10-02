import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const processAuthCallback = async () => {
      // Check for hash fragment with tokens from Supabase
      const hashFragment = window.location.hash;
      console.log('Reset password page - hash:', hashFragment);

      if (hashFragment && hashFragment.includes('access_token')) {
        // Parse the hash to check for access_token
        const params = new URLSearchParams(hashFragment.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
          console.log('Recovery token detected, processing...');

          // Exchange the recovery token for a session
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error) {
              console.error('Error exchanging code for session:', error);
              // Try alternative method - set session manually
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: params.get('refresh_token') || ''
              });

              if (!sessionError && sessionData.session) {
                setHasSession(true);
                console.log('Session set manually, user can reset password');
                // Clean the URL
                window.history.replaceState(null, '', '/auth/reset-password');
              }
            } else if (data.session) {
              setHasSession(true);
              console.log('Session established via exchange, user can reset password');
              // Clean the URL
              window.history.replaceState(null, '', '/auth/reset-password');
            }
          } catch (err) {
            console.error('Error processing recovery token:', err);
          }
        }
      }

      // Check if we already have a session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setHasSession(true);
        console.log('Existing session found');
      }
      setReady(true);
    };

    processAuthCallback();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event);
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(true);
        console.log('Auth event detected:', event);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      setSubmitting(false);
      return;
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.');
      setSubmitting(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password alterada com sucesso. Redirecionando para login…');
      setTimeout(() => setLocation('/login'), 1200);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível alterar a password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir nova password</CardTitle>
          <CardDescription>
            {ready && !hasSession
              ? 'Abra esta página através do link enviado por email para continuar.'
              : 'Introduza a sua nova password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Nova password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!hasSession || submitting}
              required
            />
            <Input
              type="password"
              placeholder="Confirmar password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!hasSession || submitting}
              required
            />
            <Button type="submit" disabled={!hasSession || submitting} className="w-full">
              {submitting ? 'A atualizar…' : 'Atualizar password'}
            </Button>
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

