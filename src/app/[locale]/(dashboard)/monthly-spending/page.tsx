'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetProgress } from '@/components/ui/budget-progress';
import { SpendingChart } from '@/components/ui/spending-chart';
import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { kidsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { Kid, UserRole } from '@/types';
import { useTranslations } from 'next-intl';

// Define types based on the API response formats
interface BudgetData {
  kid_id: string;
  kid_name: string;
  year: number;
  month: number;
  current_spending: number;
  spending_limit: number;
  remaining_budget: number;
  has_limit: boolean;
}

interface SpendingData {
  kid_id: string;
  kid_name: string;
  monthly_records: Array<{
    id: string;
    kid_id: string;
    year: number;
    month: number;
    spending_amount: string;
    created_at: string;
    updated_at: string;
  }>;
  orders: Array<{
    id: string;
    date: string;
    total_amount: string;
    items_count: number;
  }>;
  spending_by_product_group: Array<{
    product_group_id: string;
    product_group_name: string;
    amount: number;
  }>;
  spending_by_product: Array<{
    product_id: string;
    product_name: string;
    amount: number;
  }>;
  total_orders: number;
  total_spent: number;
}

function MonthlySpendingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations();

  // State
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [spendingHistory, setSpendingHistory] = useState<{label: string, value: number}[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<{label: string, value: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSpending, setIsLoadingSpending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent duplicate API calls
  const fetchingKids = useRef(false);
  const fetchingSpending = useRef(false);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get current month and year
  const currentDate = new Date();
  const currentMonthNumber = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();

  // Fetch kids data
  const fetchKids = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingKids.current) return;
    fetchingKids.current = true;

    try {
      setIsLoading(true);
      setError(null);

      let kidsData: Kid[] = [];

      if (user?.role === UserRole.PARENT) {
        const response = await kidsApi.getMyKids();
        kidsData = extractResponseData<Kid[]>(response) || [];
      } else if (user?.role === UserRole.ADMIN) {
        const response = await kidsApi.getAllKids();
        kidsData = extractResponseData<Kid[]>(response) || [];
      }

      setKids(kidsData);

      // Select first kid by default if available
      if (kidsData.length > 0 && !selectedKidId) {
        setSelectedKidId(kidsData[0].id);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(typeof errorMessage === 'string' ? errorMessage : 'Error fetching kids data');
      toast({
        title: t('common.error'),
        description: typeof errorMessage === 'string' ? errorMessage : 'Error fetching kids data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      fetchingKids.current = false;
    }
  }, [user?.role, t, toast]);

  // Fetch spending data
  const fetchSpendingData = useCallback(async (kidId: string) => {
    // Prevent duplicate calls
    if (fetchingSpending.current) return;
    fetchingSpending.current = true;

    try {
      setIsLoadingSpending(true);
      setError(null);

      // Fetch budget data
      const budgetResponse = await kidsApi.getRemainingBudget(kidId);
      const budgetData = extractResponseData<BudgetData>(budgetResponse);
      setBudgetData(budgetData || null);

      // Fetch spending data
      const spendingResponse = await kidsApi.getKidMonthlySpending(kidId, currentMonthNumber, currentYear);
      const spendingData = extractResponseData<SpendingData>(spendingResponse);

      // Transform spending by category for chart
      if (spendingData?.spending_by_product_group) {
        const categoryData = spendingData.spending_by_product_group.map(item => ({
          label: item.product_group_name,
          value: item.amount
        }));
        setSpendingByCategory(categoryData);
      } else {
        setSpendingByCategory([]);
      }

      // Transform orders for history chart
      if (spendingData?.orders) {
        const historyData = spendingData.orders.map(order => ({
          label: formatDate(order.date),
          value: parseFloat(order.total_amount)
        }));
        setSpendingHistory(historyData);
      } else {
        setSpendingHistory([]);
      }

      // Update kids with current month spending and budget
      setKids(prevKids =>
        prevKids.map(kid => {
          if (kid.id === kidId && budgetData) {
            return {
              ...kid,
              current_month_spending: budgetData.current_spending,
              monthly_spending_limit: budgetData.spending_limit
            };
          }
          return kid;
        })
      );
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(typeof errorMessage === 'string' ? errorMessage : 'Error fetching spending data');
      toast({
        title: t('common.error'),
        description: typeof errorMessage === 'string' ? errorMessage : 'Error fetching spending data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSpending(false);
      fetchingSpending.current = false;
    }
  }, [currentMonthNumber, currentYear, t, toast]);

  // Load initial data
  useEffect(() => {
    fetchKids();
  }, [fetchKids]);

  // Fetch spending data when selected kid changes
  useEffect(() => {
    if (selectedKidId) {
      fetchSpendingData(selectedKidId);
    }
  }, [selectedKidId, fetchSpendingData]);

  // Handle kid selection
  const handleKidSelect = (kidId: string) => {
    setSelectedKidId(kidId);
  };

  // Find selected kid
  const selectedKid = kids.find(kid => kid.id === selectedKidId);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('spending.title')}</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">{t('common.error')}:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : kids.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">{t('kids.none')}:</strong>
          <span className="block sm:inline"> {t('kids.add.prompt')}</span>
          <div className="mt-4">
            <Button onClick={() => window.location.href = `/en/kids/new`}>
              {t('kids.add.button')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {kids.map((kid) => (
              <Card
                key={kid.id}
                className={`cursor-pointer transition-all ${selectedKidId === kid.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleKidSelect(kid.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle>{kid.name}</CardTitle>
                  <CardDescription>{kid.schools && kid.schools.length > 0 ? kid.schools[0].name : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetData && selectedKidId === kid.id ? (
                    <BudgetProgress
                      spent={budgetData.current_spending}
                      limit={budgetData.spending_limit}
                    />
                  ) : (
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedKid && (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedKid.name}</CardTitle>
                      <CardDescription>{selectedKid.schools && selectedKid.schools.length > 0 ? selectedKid.schools[0].name : ''}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = `/en/kids/${selectedKid.id}`}
                      >
                        {t('kids.details.tabs.profile')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSpending ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <Tabs defaultValue="spending">
                      <TabsList className="mb-4">
                        <TabsTrigger value="spending">{t('spending.tabs.spending')}</TabsTrigger>
                        <TabsTrigger value="history">{t('spending.tabs.history')}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="spending">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-4">{t('spending.budget.title')}</h3>
                            {budgetData && (
                              <div className="space-y-4">
                                <BudgetProgress
                                  spent={budgetData.current_spending}
                                  limit={budgetData.spending_limit}
                                />
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <p className="text-sm text-gray-500">{t('spending.budget.spent')}</p>
                                    <p className="text-xl font-bold">{budgetData.current_spending} zł</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">{t('spending.budget.remaining')}</p>
                                    <p className="text-xl font-bold">{budgetData.remaining_budget} zł</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-4">{t('spending.categories.title')}</h3>
                            {spendingByCategory.length > 0 ? (
                              <SpendingChart data={spendingByCategory} title={t('spending.categories.title')} />
                            ) : (
                              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">{t('spending.noData')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="history">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">{t('spending.history.title')}</h3>
                          {spendingHistory.length > 0 ? (
                            <div className="h-80">
                              <SpendingChart data={spendingHistory} type="bar" title={t('spending.history.title')} />
                            </div>
                          ) : (
                            <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
                              <p className="text-gray-500">{t('spending.noData')}</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default withAuth(MonthlySpendingPage);