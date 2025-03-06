'use client';

import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { productGroupsApi, productsApi } from '@/lib/api';
import { ProductGroup, Product, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface ProductGroupDetailPageProps {
  params: {
    id: string;
  };
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

function ProductGroupDetailPage({ params }: ProductGroupDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [productGroup, setProductGroup] = useState<ProductGroup | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchProductGroup = async () => {
      try {
        setIsLoading(true);
        const response = await productGroupsApi.getProductGroupById(params.id);
        if (response.data) {
          setProductGroup(response.data);
          form.reset({
            name: response.data.name,
            description: response.data.description || '',
            is_active: response.data.is_active,
          });
        } else {
          notFound();
        }
      } catch (error) {
        console.error('Error fetching product group details:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch product group details. Please try again.',
          variant: 'destructive',
        });
        router.push('/product-groups');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProducts = async () => {
      try {
        setIsProductsLoading(true);
        const response = await productsApi.getProductsByGroup(params.id);
        if (response.data) {
          setProducts(response.data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching group products:', error);
        setProducts([]);
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchProductGroup();
    fetchProducts();
  }, [params.id, router, toast, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!productGroup) return;

    try {
      const updatedData = {
        name: values.name,
        description: values.description || undefined,
        is_active: values.is_active,
      };

      const response = await productGroupsApi.updateProductGroup(productGroup.id, updatedData);

      if (response.data) {
        setProductGroup(response.data);
        toast({
          title: 'Success',
          description: 'Product group updated successfully.',
        });
      }
    } catch (error) {
      console.error('Error updating product group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product group. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProductGroup = async () => {
    if (!productGroup) return;

    try {
      await productGroupsApi.deleteProductGroup(productGroup.id);
      toast({
        title: 'Success',
        description: 'Product group deleted successfully.',
      });
      router.push('/product-groups');
    } catch (error: any) {
      console.error('Error deleting product group:', error);

      // Check if the error is because the group has products
      if (error.response?.status === 400) {
        toast({
          title: 'Cannot Delete',
          description: 'This product group has associated products. Remove all products from this group first or deactivate it instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete product group. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  }

  if (!productGroup) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{productGroup.name}</h1>
          <p className="text-muted-foreground">
            Manage product group details and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/product-groups')}>
            Back to Product Groups
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this product group.
                  You cannot delete a group that has products. Remove all products from this group first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProductGroup}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Group Details</CardTitle>
          <CardDescription>
            View and update product group information
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
                        Make this product group available for use
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

      <Card>
        <CardHeader>
          <CardTitle>Products in this Group</CardTitle>
          <CardDescription>
            All products categorized in this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProductsLoading ? (
            <div>Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-muted-foreground text-sm py-6 text-center">
              No products in this group yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/products')}
            >
              Manage Products
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(ProductGroupDetailPage, [UserRole.ADMIN, UserRole.STAFF]);