'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { kidsApi, productsApi, ordersApi } from '@/lib/api';
import { Kid, Product } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FormData {
  [key: string]: string;
}

export default function DebugOrdersPage() {
  const t = useTranslations();
  const [kids, setKids] = useState<Kid[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedKid, setSelectedKid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kidsResponse, productsResponse] = await Promise.all([
          kidsApi.getMyKids(),
          productsApi.getProducts()
        ]);
        setKids(kidsResponse.data.data || []);
        setProducts(productsResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: t('common.error'),
          description: t('orders.errors.fetchFailed'),
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [toast, t]);

  const onSubmit = async (data: FormData) => {
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
      const items = products.map(product => ({
        product_id: product.id,
        quantity: parseInt(data[`quantity_${product.id}`] || '0', 10)
      })).filter(item => item.quantity > 0);

      if (items.length === 0) {
        toast({
          title: t('common.error'),
          description: t('orders.errors.noItems'),
          variant: 'destructive',
        });
        return;
      }

      const response = await ordersApi.createOrder({
        kid_id: selectedKid,
        items
      });

      toast({
        title: t('common.success'),
        description: t('orders.orderCreated', { id: response.data.id }),
      });

      reset();
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
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('debug.title')}</CardTitle>
          <CardDescription>{t('debug.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>{t('orders.selectKid')}</Label>
              <Select value={selectedKid} onValueChange={setSelectedKid}>
                <SelectTrigger>
                  <SelectValue placeholder={t('orders.selectKid')} />
                </SelectTrigger>
                <SelectContent>
                  {kids.map((kid) => (
                    <SelectItem key={kid.id} value={kid.id}>
                      {kid.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>{t('orders.products')}</Label>
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{t('common.price')}: {t('common.currency')}{product.price}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    {...register(`quantity_${product.id}`)}
                    className="w-24"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <Button type="submit" disabled={loading}>
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
        </CardContent>
      </Card>
    </div>
  );
}