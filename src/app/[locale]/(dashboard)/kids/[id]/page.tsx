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
import { kidsApi, ordersApi, schoolsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { Kid, Order, UserRole, School } from '@/types';
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
  const [schools, setSchools] = useState<School[]>([]);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

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
      if (response.success) {
        // Extract kid data using the utility function
        const kidData = extractResponseData<Kid>(response);

        // If user is a parent, strip out RFID information
        if (user?.role === UserRole.PARENT) {
          kidData.rfid_token = []; // Remove RFID token data for parents
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

      // Extract orders data using the utility function
      const ordersData = extractResponseData<Order[]>(ordersResponse);
      setOrders(ordersData);

      fetchSchools();

      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching kid data:', error);
      const errorInfo = handleApiError(error);
      setLoadError(true);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to fetch kid details. Please try again.',
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

      if (response.success) {
        // Extract the updated kid data
        let updatedKid = extractResponseData<Kid>(response);

        // If user is a parent, strip out RFID information from response
        if (user?.role === UserRole.PARENT) {
          updatedKid = {
            ...updatedKid,
            rfid_token: []
          };
        }

        setKid(updatedKid);
        toast({
          title: 'Success',
          description: response.message || 'Kid updated successfully.',
        });
      }
    } catch (error) {
      console.error('Error updating kid:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to update kid. Please try again.',
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

      if (response.success) {
        setRfidTokens(updatedTokens);
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
    if (!kid) return;

    try {
      const updatedTokens = rfidTokens.filter(t => t !== token);
      const response = await kidsApi.updateKid(kid.id, {
        rfid_token: updatedTokens
      });

      if (response.success) {
        setRfidTokens(updatedTokens);
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
    if (!kid) return;

    try {
      const response = await kidsApi.deleteKid(kid.id);
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
    setIsLoadingSchools(true);
    try {
      // Fetch schools associated with this kid
      const kidSchoolsResponse = await kidsApi.getKidById(kidId, {includeSchools: true});
      if (kidSchoolsResponse.success) {
        // Extract schools data from the response
        const kidData = extractResponseData<Kid & { schools: School[] }>(kidSchoolsResponse);
        setSchools(kidData.schools || []);
        setSelectedSchools((kidData.schools || []).map(school => school.id));
      }

      // Fetch all available schools
      const allSchoolsResponse = await schoolsApi.getSchools();
      if (allSchoolsResponse.success) {
        // Extract schools data from the response
        const schoolsData = extractResponseData<{ schools: School[] }>(allSchoolsResponse);
        setAvailableSchools(schoolsData.schools || []);
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
      setIsLoadingSchools(false);
    }
  };

  const handleSchoolSelectionChange = (schoolId: string, isChecked: boolean) => {
    setSelectedSchools(prev =>
      isChecked
        ? [...prev, schoolId]
        : prev.filter(id => id !== schoolId)
    );
  };

  const handleSaveSchools = async () => {
    try {
      const response = await kidsApi.updateKidSchools(kidId, selectedSchools);
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
          <TabsTrigger value="schools">Schools</TabsTrigger>
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

        <TabsContent value="schools" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Associations</CardTitle>
              <CardDescription>
                Manage which schools this kid can make purchases at
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSchools ? (
                <div className="text-center py-4">Loading schools...</div>
              ) : availableSchools.length === 0 ? (
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
                    {availableSchools.map(school => (
                      <div key={school.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`school-${school.id}`}
                          checked={selectedSchools.includes(school.id)}
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