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
import { withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ordersApi } from '@/lib/api';
import { Order, UserRole } from '@/types';
import { extractResponseData, extractPaginationData, handleApiError } from '@/lib/response-utils';
import { format } from 'date-fns';
import { useTranslations } from 'use-intl';

function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await ordersApi.getParentOrders(page, limit);

        // Extract orders data and pagination using the utility functions
        const responseData = extractResponseData<Order[]>(response);
        const orders = responseData || [];
        const total = response.total || 0;

        // Alternatively, if your response is structured with the orders directly in data
        // const orders = extractResponseData<Order[]>(response);

        // Extract pagination info
        const pagination = extractPaginationData(response);
        setTotalOrders(pagination.totalItems || total);

        // Set the orders
        setOrders(orders);

      } catch (error) {
        console.error('Error fetching orders:', error);

        const errorInfo = handleApiError(error);
        setError(errorInfo.message || 'Failed to fetch orders. Please try again.');

        // Don't show toast on initial load error - prevents spam on reload
        if (!isLoading) {
          toast({
            title: 'Error',
            description: errorInfo.message || 'Failed to fetch orders. Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    // Only re-fetch when page or limit changes
  }, [page, limit]);

  const handleViewDetails = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(totalOrders / limit);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('orders.title')}</h1>
          <p className="text-muted-foreground">
            {t('orders.description')}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
          <p>{error}</p>
        </div>
      )}

      {!error && orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full p-3 bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">{t('orders.empty.title')}</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              {t('orders.empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : !error && (
        <Card>
          <CardHeader>
            <CardTitle>{t('orders.list.title')}</CardTitle>
            <CardDescription>
              {t('orders.list.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.table.orderId')}</TableHead>
                  <TableHead>{t('orders.table.date')}</TableHead>
                  <TableHead>{t('orders.table.kid')}</TableHead>
                  <TableHead>{t('orders.table.amount')}</TableHead>
                  <TableHead>{t('orders.table.status')}</TableHead>
                  <TableHead className="text-right">{t('orders.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      {order.created_at
                        ? format(new Date(order.created_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{order.kid?.name || t('orders.table.unknown')}</TableCell>
                    <TableCell>{t('common.currency')}{Number(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t(`orders.status.${order.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(order.id)}
                      >
                        {t('orders.table.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  {t('orders.pagination.previous')}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {t('orders.pagination.page', { page, total: totalPages })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  {t('orders.pagination.next')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withAuth(OrdersPage, [UserRole.ADMIN, UserRole.PARENT, UserRole.STAFF]);