'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { withAuth } from '@/lib/auth';
import { UserRole, Kid, Order, Product } from '@/types';
import { kidsApi, ordersApi, productsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { formatDistance } from 'date-fns';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations();
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
            const kidsResponse = await kidsApi.getMyKids();
            // Extract kids data from standardized response
            const kids = extractResponseData<Kid[]>(kidsResponse);

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

            // Get recent orders for all kids
            let totalSpent = 0;
            let allOrders: Order[] = [];

            // Get orders for each kid
            for (const kid of kids) {
              try {
                const kidOrdersResponse = await ordersApi.getKidOrders(kid.id);
                // Extract orders from standardized response
                const kidOrders = extractResponseData<Order[]>(kidOrdersResponse);

                // Add kid info to each order
                const ordersWithKidInfo = kidOrders.map(order => ({
                  ...order,
                  kid: kid
                }));

                allOrders = [...allOrders, ...ordersWithKidInfo];

                // Calculate total spent
                kidOrders.forEach(order => {
                  totalSpent += Number(order.total_amount);
                });
              } catch (error) {
                console.error(`Error fetching orders for kid ${kid.id}:`, error);
              }
            }

            // Sort orders by date (newest first)
            allOrders.sort((a, b) => {
              return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            });

            // Take only the 5 most recent orders
            const recentOrders = allOrders.slice(0, 5);

            setStats({
              totalKids: kids.length,
              totalOrders: allOrders.length,
              totalSpent,
              recentOrders,
            });
          } catch (error) {
            console.error('Error fetching parent dashboard data:', error);
            const errorInfo = handleApiError(error);
            setError(errorInfo.message || t('dashboard.error.message'));
          }
        } else {
          // For admin/staff - show overview stats
          try {
            const kidsResponse = await kidsApi.getAllKids();
            // Extract kids data from standardized response
            const kids = extractResponseData<Kid[]>(kidsResponse);

            console.log('Fetching orders for admin/staff');
            const ordersResponse = await ordersApi.getParentOrders(1, 10);
            // Extract orders and pagination data
            const ordersData = extractResponseData<{orders: Order[], total: number}>(ordersResponse);
            const orders = ordersData.orders || [];
            console.log('Orders fetched:', orders.length);

            const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);

            // We could add more stats fetching here for admin dashboard
            setStats({
              totalKids: kids.length,
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
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const errorInfo = handleApiError(error);
        setError(errorInfo.message || t('dashboard.error.message'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, t]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">{t('dashboard.loading')}</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-700">{t('dashboard.error.title')}</h2>
        <p className="mt-2 text-red-600">{error}</p>
        <p className="mt-4">{t('dashboard.error.navigation')}</p>
      </div>
    );
  }

  // Special case for parent with no kids yet
  if (user?.role === UserRole.PARENT && noKidsFound) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.noKids.welcome', { name: user?.name })}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.noKids.subtitle')}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-700">{t('dashboard.noKids.title')}</h2>
          <p className="mt-2">
            {t('dashboard.noKids.message')}
          </p>
          <div className="mt-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/kids">{t('dashboard.noKids.action')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isParent = user?.role === UserRole.PARENT;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.welcome', { name: user?.name })}</h1>
        <p className="text-muted-foreground">
          {t(isParent ? 'dashboard.overview.parent' : 'dashboard.overview.admin')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(isParent ? 'dashboard.stats.kids.title.parent' : 'dashboard.stats.kids.title.admin')}
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
              {t(isParent ? 'dashboard.stats.kids.subtitle.parent' : 'dashboard.stats.kids.subtitle.admin')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(isParent ? 'dashboard.stats.orders.title.parent' : 'dashboard.stats.orders.title.admin')}
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
              {t(isParent ? 'dashboard.stats.orders.subtitle.parent' : 'dashboard.stats.orders.subtitle.admin')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.spent.title')}</CardTitle>
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
            <div className="text-2xl font-bold">{t('common.currency')}{stats.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {t(isParent ? 'dashboard.stats.spent.subtitle.parent' : 'dashboard.stats.spent.subtitle.admin')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.average.title')}</CardTitle>
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
              {t('common.currency')}{stats.totalOrders ? (stats.totalSpent / stats.totalOrders).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.stats.average.subtitle')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t('dashboard.recentOrders.title')}</h2>

        {stats.recentOrders.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-medium">{t('dashboard.recentOrders.empty.title')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(isParent ? 'dashboard.recentOrders.empty.parent' : 'dashboard.recentOrders.empty.admin')}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium">{t('dashboard.recentOrders.table.orderId')}</th>
                    <th className="p-4 text-left font-medium">{t('dashboard.recentOrders.table.kid')}</th>
                    <th className="p-4 text-left font-medium">{t('dashboard.recentOrders.table.date')}</th>
                    <th className="p-4 text-left font-medium">{t('dashboard.recentOrders.table.total')}</th>
                    <th className="p-4 text-left font-medium">{t('dashboard.recentOrders.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="p-4 text-sm">{order.id.substring(0, 8)}...</td>
                      <td className="p-4 text-sm">{order.kid?.name || t('dashboard.recentOrders.table.unknown')}</td>
                      <td className="p-4 text-sm">
                        {order.created_at
                          ? formatDistance(new Date(order.created_at), new Date(), { addSuffix: true })
                          : t('dashboard.recentOrders.table.unknownDate')}
                      </td>
                      <td className="p-4 text-sm">{t('common.currency')}{Number(order.total_amount).toFixed(2)}</td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {t(`dashboard.recentOrders.status.${order.status}`)}
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