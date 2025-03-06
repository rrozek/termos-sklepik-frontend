"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();

  const formSchema = z.object({
    email: z.string().email({ message: t('auth.login.form.email.invalid') }),
    password: z.string().min(1, { message: t('auth.login.form.password.required') }),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsLoading(true);

    try {
      await login(values.email, values.password);
      toast({
        title: t('common.success'),
        description: t('auth.login.messages.success'),
      });
    } catch (error: unknown) {
      console.error('Login error', error);

      // Extract a user-friendly error message
      let errorMessage: string;
      if (error instanceof Error) {
        // Check for specific error messages we want to show directly
        if (error.message.includes('Invalid response format') ||
            error.message.includes('No data received')) {
          errorMessage = t('auth.login.messages.serverError');
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = t('auth.login.messages.error');
      }

      setError(errorMessage);

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.login.form.email.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('auth.login.form.email.placeholder')} {...field} />
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
                <FormLabel>{t('auth.login.form.password.label')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('auth.login.form.password.placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.login.form.loading') : t('auth.login.form.submit')}
          </Button>
        </form>
      </Form>
    </div>
  );
}