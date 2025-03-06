'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { productsApi, productGroupsApi } from '@/lib/api';
import { Product, ProductGroup, UserRole } from '@/types';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';

function ProductsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSchema = z.object({
    name: z.string().min(1, t('products.form.name.required')),
    description: z.string().optional(),
    ingredients: z.string().optional(),
    barcode: z.string().optional(),
    price: z.string()
      .min(1, t('products.form.price.required'))
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) >= 0,
        { message: t('products.form.price.invalid') }
      ),
    product_group_id: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      ingredients: '',
      barcode: '',
      price: '',
      product_group_id: undefined,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [productsResponse, groupsResponse] = await Promise.all([
          productsApi.getProducts(),
          productGroupsApi.getProductGroups()
        ]);

        const productsData = extractResponseData<Product[]>(productsResponse);
        setProducts(productsData || []);

        const groupsData = extractResponseData<ProductGroup[]>(groupsResponse);
        setProductGroups(groupsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        const errorInfo = handleApiError(error);
        setError(errorInfo.message || t('products.messages.fetchError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const productData = {
        name: values.name,
        description: values.description || undefined,
        ingredients: values.ingredients || undefined,
        barcode: values.barcode || undefined,
        price: Number(values.price),
        product_group_id: values.product_group_id || undefined,
      };

      const response = await productsApi.createProduct(productData);

      if (response.success) {
        const newProduct = extractResponseData<Product>(response);
        setProducts((prev) => [...prev, newProduct]);
        setDialogOpen(false);
        form.reset();
        toast({
          title: t('common.success'),
          description: response.message || t('products.messages.createSuccess'),
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: t('common.error'),
        description: errorInfo.message || t('products.messages.createError'),
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  const getProductGroupName = (groupId?: string) => {
    if (!groupId) return t('common.none');
    const group = productGroups.find(g => g.id === groupId);
    return group ? group.name : t('products.form.group.unknown');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">
            {t('products.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/product-groups">{t('products.groups')}</Link>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>{t('products.add.button')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t('products.add.title')}</DialogTitle>
                <DialogDescription>
                  {t('products.add.description')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.name.label')}*</FormLabel>
                          <FormControl>
                            <Input placeholder={t('products.form.name.placeholder')} {...field} />
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
                          <FormLabel>{t('products.form.price.label')}*</FormLabel>
                          <FormControl>
                            <Input placeholder={t('products.form.price.placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('products.form.description.label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('products.form.description.placeholder')} {...field} />
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
                        <FormLabel>{t('products.form.ingredients.label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('products.form.ingredients.placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.barcode.label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('products.form.barcode.placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="product_group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.group.label')}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.group.placeholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">{t('common.none')}</SelectItem>
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
                  </div>
                  <DialogFooter>
                    <Button type="submit">{t('common.submit')}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('products.table.name')}</TableHead>
                <TableHead>{t('products.table.price')}</TableHead>
                <TableHead>{t('products.table.group')}</TableHead>
                <TableHead className="text-right">{t('products.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{t('common.currency')}{product.price}</TableCell>
                  <TableCell>{getProductGroupName(product.product_group_id)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleViewDetails(product.id)}
                    >
                      {t('products.table.viewDetails')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default withAuth(ProductsPage, [UserRole.ADMIN, UserRole.STAFF]);
