'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ordersApi } from '@/lib/api';
import { Order, UserRole } from '@/types';
import { format } from 'date-fns';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await ordersApi.getOrderById(params.id);

        if (response.data) {
          setOrder(response.data);
        } else {
          notFound();
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch order details. Please try again.',
          variant: 'destructive',
        });
        router.push('/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, router, toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  }

  if (!order) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
          <p className="text-muted-foreground">
            Order #{order.id.substring(0, 8)}...
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/orders')}>
          Back to Orders
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>Basic order details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium">Order ID:</dt>
                <dd>{order.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Date:</dt>
                <dd>
                  {order.created_at
                    ? format(new Date(order.created_at), 'MMMM d, yyyy h:mm a')
                    : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Status:</dt>
                <dd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    order.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Total Amount:</dt>
                <dd className="font-bold">${Number(order.total_amount).toFixed(2)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Kid and parent details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium">Kid Name:</dt>
                <dd>{order.kid?.name || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Parent ID:</dt>
                <dd>{order.parent_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">RFID Token:</dt>
                <dd>{order.kid?.rfid_token?.[0] || 'Unknown'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>Products purchased in this order</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {item.discount_applied
                      ? `$${Number(item.discount_applied).toFixed(2)}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">${Number(item.total_price).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div></div>
          <div className="text-right">
            <div className="flex justify-end space-x-4">
              <span className="font-medium">Total:</span>
              <span className="font-bold">${Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Admin-only action buttons */}
      {user?.role === UserRole.ADMIN && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={order.status !== 'pending'}>
            Mark as Completed
          </Button>
          <Button variant="destructive" disabled={order.status !== 'pending'}>
            Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
}

export default withAuth(OrderDetailPage, [UserRole.ADMIN, UserRole.PARENT, UserRole.STAFF]);