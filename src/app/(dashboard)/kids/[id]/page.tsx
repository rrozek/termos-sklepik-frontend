'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { kidsApi, ordersApi } from '@/lib/api';
import { Kid, Order, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Error boundary component
class KidDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Kid detail page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-semibold text-red-700">Error Loading Kid Details</h2>
          <p className="mt-2 text-red-600">There was a problem loading this page. Please try again later.</p>
          <Button
            className="mt-4 bg-red-600 hover:bg-red-700"
            onClick={() => {
              window.location.href = '/kids';
            }}
          >
            Return to Kids Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rfid_token: z.string().optional(),
  monthly_spending_limit: z.string()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      { message: 'Must be a valid number' }
    )
    .transform((val) => val ? Number(val) : undefined),
  is_active: z.boolean().default(true),
});

function KidDetailPage() {
  // Use the Next.js hooks to get the ID
  const router = useRouter();
  const params = useParams();
  const kidId = typeof params?.id === 'string' ? params.id : '';

  const { toast } = useToast();
  const { user } = useAuth();
  const [kid, setKid] = useState<Kid | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [rfidTokens, setRfidTokens] = useState<string[]>([]);
  const [newRfidToken, setNewRfidToken] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      rfid_token: '',
      monthly_spending_limit: '',
      is_active: true,
    },
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!kidId || loadError || dataFetched) return;

    try {
      setIsLoading(true);
      setIsOrdersLoading(true);

      // Fetch kid details
      const response = await kidsApi.getKidById(kidId);
      if (response.data) {
        // If user is a parent, strip out RFID information
        let kidData = response.data;
        if (user?.role === UserRole.PARENT) {
          kidData = {
            ...kidData,
            rfid_token: [] // Remove RFID token data for parents
          };
        }

        setKid(kidData);
        setRfidTokens(user?.role === UserRole.PARENT ? [] : (kidData.rfid_token || []));

        form.reset({
          name: kidData.name,
          rfid_token: '',
          monthly_spending_limit: kidData.monthly_spending_limit ?
            String(kidData.monthly_spending_limit) : '',
          is_active: kidData.is_active,
        });
      } else {
        notFound();
      }

      // Fetch orders
      const ordersResponse = await ordersApi.getKidOrders(kidId);
      if (ordersResponse.data && ordersResponse.data.orders) {
        setOrders(ordersResponse.data.orders);
      }

      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching kid data:', error);
      setLoadError(true);
      toast({
        title: 'Error',
        description: 'Failed to fetch kid details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsOrdersLoading(false);
    }
  }, [kidId, form, user?.role, toast, loadError, dataFetched]);

  // Only fetch data once
  useEffect(() => {
    if (kidId && !dataFetched && !loadError) {
      fetchData();
    }
  }, [kidId, fetchData, dataFetched, loadError]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!kid) return;

    try {
      const updatedData: Partial<Kid> = {
        name: values.name,
        monthly_spending_limit: values.monthly_spending_limit,
        is_active: values.is_active,
      };

      const response = await kidsApi.updateKid(kid.id, updatedData);

      if (response.data) {
        // If user is a parent, strip out RFID information from response
        let updatedKid = response.data;
        if (user?.role === UserRole.PARENT) {
          updatedKid = {
            ...updatedKid,
            rfid_token: []
          };
        }

        setKid(updatedKid);
        toast({
          title: 'Success',
          description: 'Kid updated successfully.',
        });
      }
    } catch (error) {
      console.error('Error updating kid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update kid. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddRfidToken = async () => {
    if (!kid || !newRfidToken.trim()) return;

    try {
      const updatedTokens = [...rfidTokens, newRfidToken];
      const response = await kidsApi.updateKid(kid.id, {
        rfid_token: updatedTokens
      });

      if (response.data) {
        setRfidTokens(updatedTokens);
        setNewRfidToken('');
        toast({
          title: 'Success',
          description: 'RFID token added successfully.',
        });
      }
    } catch (error) {
      console.error('Error adding RFID token:', error);
      toast({
        title: 'Error',
        description: 'Failed to add RFID token. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRfidToken = async (token: string) => {
    if (!kid) return;

    try {
      const updatedTokens = rfidTokens.filter(t => t !== token);
      const response = await kidsApi.updateKid(kid.id, {
        rfid_token: updatedTokens
      });

      if (response.data) {
        setRfidTokens(updatedTokens);
        toast({
          title: 'Success',
          description: 'RFID token removed successfully.',
        });
      }
    } catch (error) {
      console.error('Error removing RFID token:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove RFID token. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKid = async () => {
    if (!kid) return;

    try {
      await kidsApi.deleteKid(kid.id);
      toast({
        title: 'Success',
        description: 'Kid deleted successfully.',
      });
      router.push('/kids');
    } catch (error) {
      console.error('Error deleting kid:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete kid. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loadError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-700">Error Loading Kid Details</h2>
        <p className="mt-2 text-red-600">There was a problem loading this page. Please try again later.</p>
        <Button
          className="mt-4 bg-red-600 hover:bg-red-700"
          onClick={() => {
            router.push('/kids');
          }}
        >
          Return to Kids Page
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  }

  if (!kid) {
    return notFound();
  }

  // Determine which tabs should be visible based on user role
  const defaultTab = "profile";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{kid.name}</h1>
          <p className="text-muted-foreground">
            Manage your child's account and view purchase history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/kids')}>
            Back to Kids
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your child's
                  account and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteKid}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {/* RFID tab only for admin/staff users */}
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && (
            <TabsTrigger value="rfid">RFID Tags</TabsTrigger>
          )}
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your child's basic information and spending limits
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
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthly_spending_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Spending Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="50.00" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Maximum amount your child can spend each month
                        </FormDescription>
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
                            Allow your child to make purchases
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
                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFID Tags Tab - Only render for admin/staff */}
        {(user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && (
          <TabsContent value="rfid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>RFID Tags</CardTitle>
                <CardDescription>
                  Manage RFID tags used for authentication at the kiosk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter RFID tag number"
                      value={newRfidToken}
                      onChange={(e) => setNewRfidToken(e.target.value)}
                    />
                    <Button onClick={handleAddRfidToken}>Add Tag</Button>
                  </div>

                  {rfidTokens.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No RFID tags assigned</div>
                  ) : (
                    <div className="space-y-2">
                      {rfidTokens.map((token) => (
                        <div key={token} className="flex justify-between items-center p-2 border rounded">
                          <span>{token}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRfidToken(token)}
                          >
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
                              className="h-4 w-4"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>
                View your child's purchase history and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOrdersLoading ? (
                <div>Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-muted-foreground text-sm">No purchase history yet</div>
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left font-medium">Date</th>
                          <th className="p-2 text-left font-medium">Items</th>
                          <th className="p-2 text-left font-medium">Total</th>
                          <th className="p-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b">
                            <td className="p-2 text-sm">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-2 text-sm">
                              {order.order_items?.length || 0} items
                            </td>
                            <td className="p-2 text-sm">
                              ${Number(order.total_amount).toFixed(2)}
                            </td>
                            <td className="p-2 text-sm">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                order.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrap with ErrorBoundary and Auth
const KidDetailPageWithErrorBoundary = (props) => (
  <KidDetailErrorBoundary>
    <KidDetailPage {...props} />
  </KidDetailErrorBoundary>
);

export default withAuth(KidDetailPageWithErrorBoundary, [UserRole.ADMIN, UserRole.PARENT]);