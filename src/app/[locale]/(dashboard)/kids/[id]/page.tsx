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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { kidsApi, ordersApi, schoolsApi, reportingApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { Kid, Order, UserRole, School, KidMonthlySpending } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BudgetProgress } from '@/components/ui/budget-progress';
import { SpendingChart } from '@/components/ui/spending-chart';

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
  name: z.string().min(2, {
    message: t('Name must be at least 2 characters.'),
  }),
  is_active: z.boolean().default(true),
  monthly_spending_limit: z.coerce.number().min(0, {
    message: t('Monthly spending limit must be a positive number.'),
  }),
});

function KidDetailPage() {
  // Use the Next.js hooks to get the ID
  const router = useRouter();
  const params = useParams();
  const kidId = typeof params?.id === 'string' ? params.id : '';

  const { toast } = useToast();
  const { user } = useAuth();
  const [kidData, setKidData] = useState<Kid | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRfidToken, setNewRfidToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [monthlySpending, setMonthlySpending] = useState<KidMonthlySpending | null>(null);
  const [spendingHistory, setSpendingHistory] = useState<{label: string, value: number}[]>([]);
  const [isLoadingSpending, setIsLoadingSpending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: kidData?.name || '',
      is_active: kidData?.is_active ?? true,
      monthly_spending_limit: kidData?.monthly_spending_limit || 0,
    },
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!kidId || error || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch kid details
      const response = await kidsApi.getKid(kidId);
      if (response.success) {
        // Extract kid data using the utility function
        const kidData = extractResponseData<Kid>(response);
        setKidData(kidData);

        // Fetch orders
        const ordersResponse = await ordersApi.getKidOrders(kidId);
        const ordersData = extractResponseData<Order[]>(ordersResponse);
        setOrders(ordersData);

        fetchSchools();

        // Fetch monthly spending data
        await fetchMonthlySpending();
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching kid data:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message || 'Failed to fetch kid details. Please try again.');
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to fetch kid details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [kidId, form, user?.role, toast, error, isLoading]);

  // Only fetch data once
  useEffect(() => {
    if (kidId && !error && !isLoading) {
      fetchData();
    }
  }, [kidId, fetchData, error, isLoading]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!kidId) return;

    try {
      setIsSaving(true);
      const response = await kidsApi.updateKid(kidId, {
        name: values.name,
        is_active: values.is_active,
        monthly_spending_limit: values.monthly_spending_limit,
      });

      const updatedKid = extractResponseData<Kid>(response);
      setKidData(updatedKid);
      toast({
        title: 'Success',
        description: response.message || 'Kid updated successfully.',
      });
    } catch (error) {
      console.error('Error updating kid:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to update kid. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRfidToken = async () => {
    if (!kidData || !newRfidToken.trim()) return;

    try {
      const updatedTokens = [...(kidData.rfid_token || []), newRfidToken];
      const response = await kidsApi.updateKid(kidData.id, {
        rfid_token: updatedTokens
      });

      if (response.success) {
        setKidData(prev => ({
          ...prev,
          rfid_token: updatedTokens
        }));
        setNewRfidToken('');
        toast({
          title: 'Success',
          description: response.message || 'RFID token added successfully.',
        });
      }
    } catch (error) {
      console.error('Error adding RFID token:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to add RFID token. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRfidToken = async (token: string) => {
    if (!kidData) return;

    try {
      const updatedTokens = kidData.rfid_token?.filter(t => t !== token) || [];
      const response = await kidsApi.updateKid(kidData.id, {
        rfid_token: updatedTokens
      });

      if (response.success) {
        setKidData(prev => ({
          ...prev,
          rfid_token: updatedTokens
        }));
        toast({
          title: 'Success',
          description: response.message || 'RFID token removed successfully.',
        });
      }
    } catch (error) {
      console.error('Error removing RFID token:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to remove RFID token. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKid = async () => {
    if (!kidData) return;

    try {
      const response = await kidsApi.deleteKid(kidData.id);
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Kid deleted successfully.',
        });
        router.push('/kids');
      }
    } catch (error) {
      console.error('Error deleting kid:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to delete kid. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      // Fetch schools associated with this kid
      const kidSchoolsResponse = await kidsApi.getKidById(kidId, {includeSchools: true});
      if (kidSchoolsResponse.success) {
        // Extract schools data from the response
        const kidData = extractResponseData<Kid & { schools: School[] }>(kidSchoolsResponse);
        setSchools(kidData.schools || []);
        setSelectedSchools((kidData.schools || []).map(school => school.id));
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to fetch schools',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolSelectionChange = (schoolId: string, isChecked: boolean) => {
    setSelectedSchools(prev => ({
      ...prev,
      [schoolId]: isChecked
    }));
  };

  const handleSaveSchools = async () => {
    try {
      const response = await kidsApi.updateKidSchools(kidId, Object.keys(selectedSchools));
      if (response.success) {
        // Extract schools data from the response
        const updatedSchools = extractResponseData<School[]>(response);
        setSchools(updatedSchools);

        toast({
          title: 'Success',
          description: response.message || 'School associations updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update school associations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Add function to fetch monthly spending data
  const fetchMonthlySpending = useCallback(async () => {
    if (!kidId) return;

    try {
      setIsLoadingSpending(true);
      const response = await kidsApi.getKidMonthlySpending(kidId);
      const spendingData = extractResponseData<KidMonthlySpending>(response);
      setMonthlySpending(spendingData);

      // Also fetch remaining budget
      const budgetResponse = await kidsApi.getRemainingBudget(kidId);
      const budgetData = extractResponseData<{ remaining: number, limit: number, spent: number }>(budgetResponse);

      // Update kid data with current spending information
      if (kidData) {
        setKidData(prev => ({
          ...prev,
          remaining_budget: budgetData.remaining,
          current_month_spending: budgetData.spent
        }));
      }

      // Fetch spending history for the last 6 months
      const historyResponse = await reportingApi.getKidSpendingHistory(kidId, 'monthly');
      const historyData = extractResponseData<SpendingReport>(historyResponse);

      // Transform data for chart
      if (historyData.breakdown_by_product) {
        const chartData = Object.entries(historyData.breakdown_by_product).map(([label, value]) => ({
          label,
          value
        }));
        setSpendingHistory(chartData);
      }
    } catch (error) {
      console.error('Error fetching monthly spending:', error);
      handleApiError(error, toast);
    } finally {
      setIsLoadingSpending(false);
    }
  }, [kidId, kidData, toast]);

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-700">Error Loading Kid Details</h2>
        <p className="mt-2 text-red-600">{error}</p>
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

  if (!kidData) {
    return notFound();
  }

  // Determine which tabs should be visible based on user role
  const defaultTab = "details";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{kidData.name}</h1>
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
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
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
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
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
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Spending Tab */}
        <TabsContent value="spending">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Month Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Current Month Spending</CardTitle>
                <CardDescription>
                  Spending for the current month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSpending ? (
                  <div className="flex justify-center py-4">
                    <p>Loading spending data...</p>
                  </div>
                ) : kidData ? (
                  <div className="space-y-6">
                    <BudgetProgress
                      spent={kidData.current_month_spending || 0}
                      limit={kidData.monthly_spending_limit || 0}
                    />

                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Spent</p>
                          <p className="text-2xl font-bold">
                            {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                              .format(kidData.current_month_spending || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Remaining</p>
                          <p className="text-2xl font-bold">
                            {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                              .format(kidData.remaining_budget || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>No spending data available</p>
                )}
              </CardContent>
            </Card>

            {/* Spending History */}
            <Card>
              <CardHeader>
                <CardTitle>Spending History</CardTitle>
                <CardDescription>
                  Recent spending history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSpending ? (
                  <div className="flex justify-center py-4">
                    <p>Loading spending history...</p>
                  </div>
                ) : spendingHistory.length > 0 ? (
                  <SpendingChart
                    data={spendingHistory}
                    title="Spending by Product"
                    height={200}
                  />
                ) : (
                  <p>No spending history available</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Most recent purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <p>Loading transactions...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Order ID</th>
                          <th className="text-left py-2">Items</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="border-b">
                            <td className="py-2">
                              {new Date(order.created_at || '').toLocaleDateString()}
                            </td>
                            <td className="py-2">{order.id.substring(0, 8)}</td>
                            <td className="py-2">{order.items?.length || 0}</td>
                            <td className="py-2 text-right">
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                                .format(order.total_amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No transactions available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schools" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Associations</CardTitle>
              <CardDescription>
                Manage which schools this kid can make purchases at
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading schools...</div>
              ) : schools.length === 0 ? (
                <div className="text-center py-4">
                  <p>No schools available. Please add schools first.</p>
                  {(user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && (
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => router.push('/schools')}
                    >
                      Manage Schools
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {schools.map(school => (
                      <div key={school.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`school-${school.id}`}
                          checked={selectedSchools[school.id]}
                          onCheckedChange={(checked) =>
                            handleSchoolSelectionChange(school.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`school-${school.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {school.name}
                          {!school.is_active && (
                            <span className="ml-2 text-xs text-gray-500 italic">(Inactive)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleSaveSchools}>
                      Save School Associations
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>
                View your child's purchase history and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
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