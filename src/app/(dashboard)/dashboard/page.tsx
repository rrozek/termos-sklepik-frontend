'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { withAuth } from '@/lib/auth';
import { UserRole, Kid, Order, Product } from '@/types';
import { kidsApi, ordersApi, productsApi } from '@/lib/api';
import { formatDistance } from 'date-fns';
import Link from 'next/link';

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalKids: 0,
    totalOrders: 0,
    totalSpent: 0,
    recentOrders: [] as Order[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noKidsFound, setNoKidsFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setNoKidsFound(false);
        console.log('Fetching dashboard data for user:', user?.email);

        // Different data based on user role
        if (user?.role === UserRole.PARENT) {
          // For parents - show their kids and orders
          try {
            console.log('Fetching kids for parent');
            const kidsResponse = await kidsApi.getKids();
            const kids = Array.isArray(kidsResponse.data) ? kidsResponse.data : [];
            console.log('Kids fetched:', kids.length);

            // Handle case when parent has no kids yet
            if (kids.length === 0) {
              setNoKidsFound(true);
              setStats({
                totalKids: 0,
                totalOrders: 0,
                totalSpent: 0,
                recentOrders: [],
              });

              setIsLoading(false);
              return;
            }

            console.log('Fetching orders for parent');
            const ordersResponse = await ordersApi.getParentOrders(1, 5);
            const orders = ordersResponse.data?.orders || [];
            console.log('Orders fetched:', orders.length);

            const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);

            setStats({
              totalKids: kids.length,
              totalOrders: orders.length,
              totalSpent,
              recentOrders: orders.slice(0, 5),
            });
          } catch (err) {
            console.error('Error fetching parent data:', err);
            // If an error occurs fetching kids, assume no kids found
            setNoKidsFound(true);
            setStats({
              totalKids: 0,
              totalOrders: 0,
              totalSpent: 0,
              recentOrders: [],
            });
          }
        } else {
          // For admin/staff - show overview stats
          try {
            console.log('Fetching orders for admin/staff');
            const ordersResponse = await ordersApi.getParentOrders(1, 10);
            const orders = ordersResponse.data?.orders || [];
            console.log('Orders fetched:', orders.length);

            const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);

            // We could add more stats fetching here for admin dashboard
            setStats({
              totalKids: 0, // This would require a new API endpoint
              totalOrders: orders.length,
              totalSpent,
              recentOrders: orders.slice(0, 5),
            });
          } catch (err) {
            console.error('Error fetching admin data:', err);
            // Still show dashboard with zeros if API fails
            setStats({
              totalKids: 0,
              totalOrders: 0,
              totalSpent: 0,
              recentOrders: [],
            });
          }
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-700">Error Loading Dashboard</h2>
        <p className="mt-2 text-red-600">{error}</p>
        <p className="mt-4">You can still navigate to other sections using the sidebar.</p>
      </div>
    );
  }

  // Special case for parent with no kids yet
  if (user?.role === UserRole.PARENT && noKidsFound) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground">
            Let's get started with setting up your account
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-700">No Kids Added Yet</h2>
          <p className="mt-2">
            You haven't added any kids to your account. Start by adding your children
            to manage their spending at the school kiosk.
          </p>
          <div className="mt-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/kids">Add Kids Now</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">
          Here's an overview of {user?.role === UserRole.PARENT ? 'your account' : 'the system'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === UserRole.PARENT ? 'Your Kids' : 'Total Kids'}
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKids}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === UserRole.PARENT ? 'Kids registered to your account' : 'Kids in the system'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === UserRole.PARENT ? 'Your Orders' : 'Total Orders'}
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === UserRole.PARENT ? 'Total orders placed by your kids' : 'Orders in the system'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === UserRole.PARENT ? 'Total spent by your kids' : 'Total transaction value'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m22 11-3-3m0 0-3 3m3-3v8" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalOrders ? (stats.totalSpent / stats.totalOrders).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Average value per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recent Orders</h2>

        {stats.recentOrders.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-medium">No orders yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === UserRole.PARENT
                ? "Your kids haven't made any purchases yet."
                : "There are no orders in the system yet."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium">Order ID</th>
                    <th className="p-4 text-left font-medium">Kid</th>
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Total</th>
                    <th className="p-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="p-4 text-sm">{order.id.substring(0, 8)}...</td>
                      <td className="p-4 text-sm">{order.kid?.name || "Unknown"}</td>
                      <td className="p-4 text-sm">
                        {order.created_at
                          ? formatDistance(new Date(order.created_at), new Date(), { addSuffix: true })
                          : "Unknown date"}
                      </td>
                      <td className="p-4 text-sm">${Number(order.total_amount).toFixed(2)}</td>
                      <td className="p-4 text-sm">
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
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);