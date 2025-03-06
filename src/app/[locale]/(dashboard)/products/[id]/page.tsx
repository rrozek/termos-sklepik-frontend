'use client';

import { useState, useEffect } from 'react';
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

import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { productsApi, productGroupsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { Product, ProductGroup, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface ProductDetailPageProps {
  params: {
    id: string;
  };
}

const formSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  price: z.string()
    .min(1, 'Price is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      { message: 'Price must be a valid positive number' }
    ),
  product_group_id: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

function ProductDetailPage({ params }: ProductDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      ingredients: '',
      barcode: '',
      image_url: '',
      price: '',
      product_group_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productResponse, groupsResponse] = await Promise.all([
          productsApi.getProductById(params.id),
          productGroupsApi.getProductGroups()
        ]);

        // Extract the product data
        const productData = extractResponseData<Product>(productResponse);
        if (productData) {
          setProduct(productData);
          form.reset({
            name: productData.name,
            description: productData.description || '',
            ingredients: productData.ingredients || '',
            barcode: productData.barcode || '',
            image_url: productData.image_url || '',
            price: productData.price.toString(),
            product_group_id: productData.product_group_id || '',
            is_active: productData.is_active,
          });
        } else {
          notFound();
        }

        // Extract the product groups data
        const groupsData = extractResponseData<{ product_groups: ProductGroup[] }>(groupsResponse);
        setProductGroups(groupsData.product_groups || []);
      } catch (error) {
        console.error('Error fetching product details:', error);
        const errorInfo = handleApiError(error);
        toast({
          title: 'Error',
          description: errorInfo.message || 'Failed to fetch product details. Please try again.',
          variant: 'destructive',
        });
        router.push('/products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, router, toast, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!product) return;

    try {
      const updatedData = {
        name: values.name,
        description: values.description || undefined,
        ingredients: values.ingredients || undefined,
        barcode: values.barcode || undefined,
        image_url: values.image_url || undefined,
        price: Number(values.price),
        product_group_id: values.product_group_id || undefined,
        is_active: values.is_active,
      };

      const response = await productsApi.updateProduct(product.id, updatedData);

      if (response.success) {
        // Extract the updated product data
        const updatedProduct = extractResponseData<Product>(response);
        setProduct(updatedProduct);

        toast({
          title: 'Success',
          description: response.message || 'Product updated successfully.',
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;

    try {
      const response = await productsApi.deleteProduct(product.id);

      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Product deleted successfully.',
        });
        router.push('/products');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  }

  if (!product) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">
            Manage product details and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/products')}>
            Back to Products
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this product
                  and it will no longer be available for purchase.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            View and update product information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ingredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingredients</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product_group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {productGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-6">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active
                        </FormLabel>
                        <FormDescription>
                          Make this product available for purchase
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

              <Button type="submit" className="mt-6">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Product preview card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Preview</CardTitle>
          <CardDescription>
            How this product appears to users
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-6">
          <div className="w-[120px] h-[120px] rounded border flex items-center justify-center bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-muted-foreground"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {product.description || 'No description available'}
            </p>
            <div className="mt-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="font-medium">Price:</span>
                <span>${Number(product.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium">Barcode:</span>
                <span>{product.barcode || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium">Status:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  product.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(ProductDetailPage, [UserRole.ADMIN, UserRole.STAFF]);