'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { discountsApi, productGroupsApi, productsApi } from '@/lib/api';
import { Discount, ProductGroup, Product, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface DiscountDetailPageProps {
  params: {
    id: string;
  };
}

const formSchema = z.object({
  name: z.string().min(1, 'Discount name is required'),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle']),
  discount_value: z.coerce.number().min(0, 'Discount value must be a positive number'),
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

function DiscountDetailPage({ params }: DiscountDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: null,
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

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all data in parallel
      const [discountResponse, productGroupsResponse, productsResponse] = await Promise.all([
        discountsApi.getDiscountById(params.id),
        productGroupsApi.getProductGroups(),
        productsApi.getProducts()
      ]);

      if (!discountResponse.data) {
        notFound();
        return;
      }

      setDiscount(discountResponse.data);
      setProductGroups(productGroupsResponse.data || []);
      setProducts(productsResponse.data || []);

      // Convert dates to required format for form fields
      const formattedData = {
        ...discountResponse.data,
        start_date: discountResponse.data.start_date ?
          new Date(discountResponse.data.start_date).toISOString().split('T')[0] : null,
        end_date: discountResponse.data.end_date ?
          new Date(discountResponse.data.end_date).toISOString().split('T')[0] : null,
        // Ensure target_id is set to null if falsy
        target_id: discountResponse.data.target_id || null,
        description: discountResponse.data.description || null,
      };

      // Reset form with fetched data
      form.reset(formattedData);
    } catch (error) {
      console.error('Error fetching discount details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch discount details. Please try again.',
        variant: 'destructive',
      });
      router.push('/discounts');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router, toast, form]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!discount) return;

    try {
      // For simpler handling, treat empty strings as undefined
      const sanitizedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          value === "" || value === null ? undefined : value
        ])
      );

      const response = await discountsApi.updateDiscount(discount.id, sanitizedValues);

      if (response.data) {
        setDiscount(response.data);
        toast({
          title: 'Success',
          description: 'Discount updated successfully.',
        });
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to update discount. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDiscount = async () => {
    if (!discount) return;

    try {
      await discountsApi.deleteDiscount(discount.id);
      toast({
        title: 'Success',
        description: 'Discount deleted successfully.',
      });
      router.push('/discounts');
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete discount. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Helper function to get target name
  const getTargetName = () => {
    if (!discount || !discount.target_id) return 'All';

    switch (discount.target_type) {
      case 'product':
        const product = products.find(p => p.id === discount.target_id);
        return product ? product.name : 'Unknown Product';
      case 'product_group':
        const group = productGroups.find(g => g.id === discount.target_id);
        return group ? group.name : 'Unknown Group';
      case 'order':
        return `Order #${discount.target_id.substring(0, 8)}`;
      case 'user':
        return `User ID: ${discount.target_id.substring(0, 8)}`;
      case 'kid':
        return `Kid ID: ${discount.target_id.substring(0, 8)}`;
      default:
        return 'Unknown';
    }
  };

  // Format discount value based on type
  const formatDiscountValue = () => {
    if (!discount) return '';

    switch (discount.discount_type) {
      case 'percentage':
        return `${discount.discount_value}%`;
      case 'fixed_amount':
        return `$${discount.discount_value.toFixed(2)}`;
      case 'buy_x_get_y':
        return `Buy ${discount.buy_quantity} Get ${discount.get_quantity} Free`;
      case 'bundle':
        return `Bundle: $${discount.discount_value.toFixed(2)}`;
      default:
        return `${discount.discount_value}`;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  }

  if (!discount) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{discount.name}</h1>
          <p className="text-muted-foreground">
            Manage discount settings and details
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/discounts')}>
            Back to Discounts
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this discount promotion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDiscount}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Rest of the component remains the same as in the previous version */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="restrictions">Time & Restrictions</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Manage discount information and type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discount_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select discount type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                              <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                              <SelectItem value="bundle">Bundle Discount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {watchDiscountType === 'percentage' ? 'Percentage*' :
                             watchDiscountType === 'fixed_amount' ? 'Amount ($)*' :
                             watchDiscountType === 'bundle' ? 'Bundle Discount ($)*' :
                             'Discount Value*'}
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step={watchDiscountType === 'percentage' ? 1 : 0.01} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Buy X Get Y specific fields */}
                  {watchDiscountType === 'buy_x_get_y' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
        name="buy_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buy Quantity*</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Number of items customer must buy
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="get_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Get Free Quantity*</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Number of items customer gets free
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Type*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="product_group">Product Group</SelectItem>
                              <SelectItem value="order">Order</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="kid">Kid</SelectItem>
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
                          <FormLabel>Target</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "null"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${watchTargetType}`} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null">All {watchTargetType}s</SelectItem>
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
                            Leave empty to apply to all {watchTargetType}s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Active
                          </FormLabel>
                          <FormDescription>
                            Enable or disable this discount
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

                  <Button type="submit" className="mt-6">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time & Restrictions Tab */}
        <TabsContent value="restrictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time & Day Restrictions</CardTitle>
              <CardDescription>
                Configure when this discount is applicable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
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
                          <FormLabel>End Date</FormLabel>
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
                          <FormLabel>Start Time</FormLabel>
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
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Day Restrictions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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

                  <Button type="submit" className="mt-6">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discount Conditions</CardTitle>
              <CardDescription>
                Set minimum conditions and other options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minimum_purchase_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Purchase Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum order amount required
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
                          <FormLabel>Min Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum item quantity required
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
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormDescription>
                            Higher priority discounts apply first
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_stackable"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Stackable</FormLabel>
                          </div>
                          <FormDescription>
                            Can be combined with other discounts
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="mt-6">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Discount Summary</CardTitle>
          <CardDescription>Overview of this discount</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Discount Type</dt>
              <dd className="text-base font-semibold capitalize">{discount.discount_type.replace('_', ' ')}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Discount Value</dt>
              <dd className="text-base font-semibold">{formatDiscountValue()}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Applied To</dt>
              <dd className="text-base font-semibold capitalize">{discount.target_type.replace('_', ' ')}: {getTargetName()}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
              <dd className="text-base font-semibold">{discount.priority}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Time Range</dt>
              <dd className="text-base font-semibold">
                {discount.start_date || discount.end_date ?
                  `${discount.start_date ? new Date(discount.start_date).toLocaleDateString() : 'Always'} to ${discount.end_date ? new Date(discount.end_date).toLocaleDateString() : 'Forever'}` :
                  'No date restrictions'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  discount.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {discount.is_active ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(DiscountDetailPage, [UserRole.ADMIN, UserRole.STAFF]);