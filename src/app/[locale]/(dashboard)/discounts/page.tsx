/* eslint-disable no-unused-vars */
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { discountsApi, productGroupsApi, productsApi } from '@/lib/api';
import { Discount, ProductGroup, Product, UserRole, DiscountType, DiscountTarget } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';

function DiscountsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSchema = z.object({
    name: z.string().min(1, t('discounts.form.name.required')),
    description: z.string().optional(),
    discount_type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle']),
    discount_value: z.coerce.number().min(0, t('discounts.form.discountValue.invalid')),
    target_type: z.enum(['product', 'product_group', 'order', 'user', 'kid']),
    target_id: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    monday_enabled: z.boolean().default(true),
    tuesday_enabled: z.boolean().default(true),
    wednesday_enabled: z.boolean().default(true),
    thursday_enabled: z.boolean().default(true),
    friday_enabled: z.boolean().default(true),
    saturday_enabled: z.boolean().default(true),
    sunday_enabled: z.boolean().default(true),
    minimum_purchase_amount: z.coerce.number().optional().nullable(),
    minimum_quantity: z.coerce.number().int().optional().nullable(),
    buy_quantity: z.coerce.number().int().optional().nullable(),
    get_quantity: z.coerce.number().int().optional().nullable(),
    is_stackable: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      target_type: 'product_group',
      target_id: null,
      start_date: null,
      end_date: null,
      start_time: null,
      end_time: null,
      monday_enabled: true,
      tuesday_enabled: true,
      wednesday_enabled: true,
      thursday_enabled: true,
      friday_enabled: true,
      saturday_enabled: true,
      sunday_enabled: true,
      minimum_purchase_amount: null,
      minimum_quantity: null,
      buy_quantity: null,
      get_quantity: null,
      is_stackable: false,
      priority: 0,
      is_active: true,
    },
  });

  // Watch form values to conditionally render fields
  const watchDiscountType = form.watch("discount_type");
  const watchTargetType = form.watch("target_type");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [discountsResponse, productGroupsResponse, productsResponse] = await Promise.all([
          discountsApi.getDiscounts(),
          productGroupsApi.getProductGroups(),
          productsApi.getProducts()
        ]);

        setDiscounts(discountsResponse.data.discounts || []);
        setProductGroups(productGroupsResponse.data.product_groups || []);
        setProducts(productsResponse.data.products || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(t('discounts.messages.fetchError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  const getTargetName = (discount: Discount) => {
    if (!discount.target_id) return t('discounts.form.targetId.all');

    switch (discount.target_type) {
      case 'product':
        const product = products.find(p => p.id === discount.target_id);
        return product ? product.name : t('discounts.messages.unknown.product');
      case 'product_group':
        const group = productGroups.find(g => g.id === discount.target_id);
        return group ? group.name : t('discounts.messages.unknown.group');
      case 'order':
        return `${t('orders.table.orderId')} #${discount.target_id.substring(0, 8)}`;
      case 'user':
        return t('discounts.messages.unknown.user');
      case 'kid':
        return t('discounts.messages.unknown.kid');
      default:
        return t('common.unknown');
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.discount_type) {
      case 'percentage':
        return `${discount.discount_value}%`;
      case 'fixed_amount':
        return `${t('common.currency')}${discount.discount_value.toFixed(2)}`;
      case 'buy_x_get_y':
        return t('discounts.form.discountType.options.buy_x_get_y_format', {
          buy: discount.buy_quantity,
          get: discount.get_quantity
        });
      case 'bundle':
        return t('discounts.form.discountType.options.bundle_format', {
          value: discount.discount_value.toFixed(2)
        });
      default:
        return `${discount.discount_value}`;
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // For simpler handling, treat empty strings as undefined
      const sanitizedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          value === "" || value === null ? undefined : value
        ])
      );

      const response = await discountsApi.createDiscount(sanitizedValues);

      if (response.data) {
        setDiscounts((prev) => [...prev, response.data]);
        setDialogOpen(false);
        form.reset();
        toast({
          title: t('common.success'),
          description: t('discounts.messages.createSuccess'),
        });
      }
    } catch (error) {
      console.error('Error creating discount:', error);
      toast({
        title: t('common.error'),
        description: t('discounts.messages.createError'),
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (discountId: string) => {
    router.push(`/discounts/${discountId}`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('discounts.title')}</h1>
          <p className="text-muted-foreground">
            {t('discounts.description')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t('discounts.add.button')}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('discounts.add.title')}</DialogTitle>
              <DialogDescription>
                {t('discounts.add.description')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Target Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('discounts.form.targetSelection.title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.targetSelection.targetType')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('discounts.form.targetSelection.selectTargetType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="product">{t('discounts.form.targetSelection.options.product')}</SelectItem>
                              <SelectItem value="product_group">{t('discounts.form.targetSelection.options.productGroup')}</SelectItem>
                              <SelectItem value="order">{t('discounts.form.targetSelection.options.order')}</SelectItem>
                              <SelectItem value="user">{t('discounts.form.targetSelection.options.user')}</SelectItem>
                              <SelectItem value="kid">{t('discounts.form.targetSelection.options.kid')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="target_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.targetSelection.target')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "null"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t(`discounts.form.targetSelection.select${watchTargetType}`)} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null">{t('discounts.form.targetSelection.options.all', { targetType: t(`discounts.form.targetSelection.options.${watchTargetType}`) })}</SelectItem>
                              {watchTargetType === 'product' && products.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                              {watchTargetType === 'product_group' && productGroups.map(group => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t('discounts.form.targetSelection.leaveEmpty')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Time and Date Restrictions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('discounts.form.timeRestrictions.title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.timeRestrictions.startDate')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.timeRestrictions.endDate')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.timeRestrictions.startTime')}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.timeRestrictions.endTime')}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Day Restrictions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('discounts.form.dayRestrictions.title')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name={`${day}_enabled` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="capitalize">{day}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('discounts.form.basicInformation.title')}</h3>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('discounts.form.basicInformation.name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('discounts.form.basicInformation.placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Advanced Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('discounts.form.advancedOptions.title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minimum_purchase_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.advancedOptions.minPurchaseAmount')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            {t('discounts.form.advancedOptions.minPurchaseAmountDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minimum_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.advancedOptions.minQuantity')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            {t('discounts.form.advancedOptions.minQuantityDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('discounts.form.advancedOptions.priority')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormDescription>
                            {t('discounts.form.advancedOptions.priorityDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_stackable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {t('discounts.form.advancedOptions.stackable')}
                            </FormLabel>
                            <FormDescription>
                              {t('discounts.form.advancedOptions.stackableDescription')}
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
                  </div>
                </div>

                {/* Active Switch */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t('discounts.form.activeSwitch.label')}
                        </FormLabel>
                        <FormDescription>
                          {t('discounts.form.activeSwitch.description')}
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
                  <Button type="submit">{t('discounts.add.submit')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
          <p>{error}</p>
        </div>
      )}

      {!error && discounts.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h3 className="text-lg font-medium">{t('discounts.empty.title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('discounts.empty.description')}
          </p>
          <Button
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            {t('discounts.add.button')}
          </Button>
        </div>
      ) : !error && (
        <Card>
          <CardHeader>
            <CardTitle>{t('discounts.list.title')}</CardTitle>
            <CardDescription>{t('discounts.list.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('discounts.table.name')}</TableHead>
                  <TableHead>{t('discounts.table.target')}</TableHead>
                  <TableHead>{t('discounts.table.value')}</TableHead>
                  <TableHead>{t('discounts.table.dates')}</TableHead>
                  <TableHead>{t('discounts.table.status')}</TableHead>
                  <TableHead className="text-right">{t('discounts.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>{discount.name}</TableCell>
                    <TableCell>{getTargetName(discount)}</TableCell>
                    <TableCell>{formatDiscountValue(discount)}</TableCell>
                    <TableCell>
                      {discount.start_date && discount.end_date ? (
                        `${new Date(discount.start_date).toLocaleDateString()} - ${new Date(discount.end_date).toLocaleDateString()}`
                      ) : t('common.none')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        discount.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t(`discounts.status.${discount.is_active ? 'active' : 'inactive'}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleViewDetails(discount.id)}
                      >
                        {t('discounts.table.viewDetails')}
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

export default withAuth(DiscountsPage, [UserRole.ADMIN, UserRole.STAFF]);