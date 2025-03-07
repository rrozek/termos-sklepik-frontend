'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { kidsApi, productsApi, ordersApi } from '@/lib/api';
import { extractResponseData } from '@/lib/response-utils';
import { Kid, Product, Order } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DebugOrdersPage() {
  const t = useTranslations();
  const { toast } = useToast();

  // State
  const [kids, setKids] = useState<Kid[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedKid, setSelectedKid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form
  const formRef = useRef<HTMLFormElement>(null);

  // Refs to prevent duplicate API calls
  const initialLoadComplete = useRef(false);
  const fetchingData = useRef(false);

  // Fetch kids and products data
  const fetchData = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingData.current) return;
    fetchingData.current = true;

    try {
      setIsLoadingData(true);

      // Fetch kids and products data
      const [kidsResponse, productsResponse] = await Promise.all([
        kidsApi.getMyKids(),
        productsApi.getProducts()
      ]);

      // Extract data using the utility function
      const kidsData = extractResponseData<Kid[]>(kidsResponse);
      const productsData = extractResponseData<Product[]>(productsResponse);

      setKids(kidsData);
      setProducts(productsData);
      initialLoadComplete.current = true;
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('common.error'),
        description: t('orders.errors.fetchFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
      fetchingData.current = false;
    }
  }, [toast, t]);

  // Initial data loading
  useEffect(() => {
    if (!initialLoadComplete.current) {
      fetchData();
    }
  }, [fetchData]);

  // Handle kid selection
  const handleKidSelect = useCallback((value: string) => {
    setSelectedKid(value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedKid) {
      toast({
        title: t('common.error'),
        description: t('orders.errors.noKidSelected'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const items = products
        .map(product => {
          const quantityStr = formData.get(`quantity_${product.id}`) as string;
          const quantity = parseInt(quantityStr || '0', 10);
          return {
            product_id: product.id,
            quantity
          };
        })
        .filter(item => item.quantity > 0);

      if (items.length === 0) {
        toast({
          title: t('common.error'),
          description: t('orders.errors.noItems'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const response = await ordersApi.createOrder({
        kid_id: selectedKid,
        items
      });

      const orderData = extractResponseData<Order>(response);

      toast({
        title: t('common.success'),
        description: t('orders.orderCreated', { id: orderData.id || 'N/A' }),
      });

      // Reset form
      if (formRef.current) {
        formRef.current.reset();
      }
      setSelectedKid('');
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: t('common.error'),
        description: t('orders.errors.createFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedKid, products, toast, t]);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('debug.title')}</CardTitle>
          <CardDescription>{t('debug.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>{t('orders.selectKid')}</Label>
                <Select value={selectedKid} onValueChange={handleKidSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.selectKid')} />
                  </SelectTrigger>
                  <SelectContent>
                    {kids.length > 0 ? (
                      kids.map((kid) => (
                        <SelectItem key={kid.id} value={kid.id}>
                          {kid.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-kids" disabled>
                        {t('orders.noKidsAvailable')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>{t('orders.products')}</Label>
                {products.length > 0 ? (
                  products.map((product) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {t('common.price')}: {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(product.price)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        name={`quantity_${product.id}`}
                        className="w-24"
                        placeholder="0"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">{t('orders.noProductsAvailable')}</p>
                )}
              </div>

              <Button type="submit" disabled={loading || kids.length === 0 || products.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('orders.creatingOrder')}
                  </>
                ) : (
                  t('orders.createOrder')
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}