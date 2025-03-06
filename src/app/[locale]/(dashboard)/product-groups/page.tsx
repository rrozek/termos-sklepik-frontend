'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { productGroupsApi } from '@/lib/api';
import { ProductGroup, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';

function ProductGroupsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSchema = z.object({
    name: z.string().min(1, t('productGroups.form.name.required')),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchProductGroups = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await productGroupsApi.getProductGroups();

        if (response.data) {
          setProductGroups(response.data);
        } else {
          setProductGroups([]);
        }
      } catch (error) {
        console.error('Error fetching product groups:', error);
        setError(t('productGroups.messages.fetchError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductGroups();
  }, [t]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await productGroupsApi.createProductGroup(values);

      if (response.data) {
        setProductGroups((prev) => [...prev, response.data]);
        setDialogOpen(false);
        form.reset();
        toast({
          title: t('common.success'),
          description: t('productGroups.messages.createSuccess'),
        });
      }
    } catch (error) {
      console.error('Error creating product group:', error);
      toast({
        title: t('common.error'),
        description: t('productGroups.messages.createError'),
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (groupId: string) => {
    router.push(`/product-groups/${groupId}`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('productGroups.title')}</h1>
          <p className="text-muted-foreground">
            {t('productGroups.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/products">{t('products.title')}</a>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>{t('productGroups.add.button')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t('productGroups.add.title')}</DialogTitle>
                <DialogDescription>
                  {t('productGroups.add.description')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productGroups.form.name.label')}*</FormLabel>
                        <FormControl>
                          <Input placeholder={t('productGroups.form.name.placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productGroups.form.description.label')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('productGroups.form.description.placeholder')}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('productGroups.form.isActive.label')}
                          </FormLabel>
                          <FormDescription>
                            {t('productGroups.form.isActive.description')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit">{t('common.save')}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
          <p>{error}</p>
        </div>
      )}

      {!error && productGroups.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h3 className="text-lg font-medium">{t('productGroups.empty.title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('productGroups.empty.description')}
          </p>
          <Button
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            {t('productGroups.add.button')}
          </Button>
        </div>
      ) : !error && (
        <Card>
          <CardHeader>
            <CardTitle>{t('productGroups.list.title')}</CardTitle>
            <CardDescription>{t('productGroups.list.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('productGroups.table.name')}</TableHead>
                  <TableHead>{t('productGroups.table.description')}</TableHead>
                  <TableHead>{t('productGroups.table.productsCount')}</TableHead>
                  <TableHead>{t('productGroups.table.status')}</TableHead>
                  <TableHead className="text-right">{t('productGroups.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.description}</TableCell>
                    <TableCell>{group.products_count || 0}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        group.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t(`productGroups.status.${group.is_active ? 'active' : 'inactive'}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleViewDetails(group.id)}
                      >
                        {t('productGroups.table.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withAuth(ProductGroupsPage, [UserRole.ADMIN, UserRole.STAFF]);