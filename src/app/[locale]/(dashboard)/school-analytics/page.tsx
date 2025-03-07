'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpendingChart } from '@/components/ui/spending-chart';
import { TimeRestrictionDisplay } from '@/components/ui/time-restriction-display';
import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { schoolsApi, reportingApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { School, SchoolReport, UserRole } from '@/types';
import { useTranslations } from 'next-intl';

function SchoolAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations();

  // State
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [dailyReport, setDailyReport] = useState<SchoolReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<SchoolReport | null>(null);
  const [topProducts, setTopProducts] = useState<{label: string, value: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Refs to prevent duplicate API calls
  const initialLoadComplete = useRef(false);
  const fetchingSchools = useRef(false);
  const fetchingReports = useRef(false);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  }, []);

  // Get month name
  const getMonthName = useCallback((month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('pl-PL', { month: 'long' });
  }, []);

  // Fetch schools data
  const fetchSchools = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingSchools.current) return;
    fetchingSchools.current = true;

    try {
      setIsLoading(true);
      setError(null);

      const response = await schoolsApi.getSchools();
      const schoolsData = extractResponseData<School[]>(response);
      setSchools(schoolsData);

      // Select the first school by default if we have schools and none is selected
      if (schoolsData.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(schoolsData[0].id);
      }

      initialLoadComplete.current = true;
    } catch (error) {
      console.error('Error fetching schools:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message || t('schoolAnalytics.errorFetchingSchools'));
    } finally {
      setIsLoading(false);
      fetchingSchools.current = false;
    }
  }, [selectedSchoolId, t]);

  // Fetch reports data
  const fetchReports = useCallback(async (schoolId: string) => {
    // Prevent duplicate calls
    if (fetchingReports.current) return;
    fetchingReports.current = true;

    try {
      setIsLoadingReports(true);

      try {
        // Fetch daily report
        const dailyResponse = await reportingApi.getSchoolDailyReport(schoolId, selectedDate);
        const dailyData = extractResponseData<SchoolReport>(dailyResponse);

        // If the response doesn't have the expected structure, create a default report
        if (!dailyData || !dailyData.total_orders) {
          setDailyReport({
            school_id: schoolId,
            school_name: schools.find(s => s.id === schoolId)?.name || '',
            period: 'daily',
            date: selectedDate,
            total_orders: 0,
            total_revenue: 0,
            total_kids_served: 0,
            top_products: []
          });
        } else {
          setDailyReport(dailyData);
        }
      } catch (dailyError) {
        console.error('Error fetching daily report:', dailyError);
        // Create a default report on error
        setDailyReport({
          school_id: schoolId,
          school_name: schools.find(s => s.id === schoolId)?.name || '',
          period: 'daily',
          date: selectedDate,
          total_orders: 0,
          total_revenue: 0,
          total_kids_served: 0,
          top_products: []
        });
      }

      try {
        // Fetch monthly report
        const monthlyResponse = await reportingApi.getSchoolMonthlyReport(
          schoolId,
          selectedMonth,
          selectedYear
        );
        const monthlyData = extractResponseData<SchoolReport>(monthlyResponse);

        // If the response doesn't have the expected structure, create a default report
        if (!monthlyData || !monthlyData.total_orders) {
          setMonthlyReport({
            school_id: schoolId,
            school_name: schools.find(s => s.id === schoolId)?.name || '',
            period: 'monthly',
            date: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
            total_orders: 0,
            total_revenue: 0,
            total_kids_served: 0,
            top_products: []
          });
        } else {
          setMonthlyReport(monthlyData);
        }
      } catch (monthlyError) {
        console.error('Error fetching monthly report:', monthlyError);
        // Create a default report on error
        setMonthlyReport({
          school_id: schoolId,
          school_name: schools.find(s => s.id === schoolId)?.name || '',
          period: 'monthly',
          date: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
          total_orders: 0,
          total_revenue: 0,
          total_kids_served: 0,
          top_products: []
        });
      }

      try {
        // Fetch top products
        const topProductsResponse = await reportingApi.getTopProducts(schoolId, 10);
        const topProductsData = extractResponseData<Array<{product_id: string, product_name: string, quantity: number}>>(topProductsResponse);

        // Transform data for chart
        if (topProductsData && topProductsData.length > 0) {
          const chartData = topProductsData.map(product => ({
            label: product.product_name,
            value: product.quantity
          }));
          setTopProducts(chartData);
        } else {
          setTopProducts([]);
        }
      } catch (productsError) {
        console.error('Error fetching top products:', productsError);
        setTopProducts([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Don't show error toast for this, just set default values
      setDailyReport(null);
      setMonthlyReport(null);
      setTopProducts([]);
    } finally {
      setIsLoadingReports(false);
      fetchingReports.current = false;
    }
  }, [selectedDate, selectedMonth, selectedYear, schools]);

  // Initial data loading
  useEffect(() => {
    if (!initialLoadComplete.current) {
      fetchSchools();
    }
  }, [fetchSchools]);

  // Fetch reports when school or date/month/year changes
  useEffect(() => {
    if (selectedSchoolId) {
      fetchReports(selectedSchoolId);
    }
  }, [selectedSchoolId, selectedDate, selectedMonth, selectedYear, fetchReports]);

  // Get selected school data
  const selectedSchool = schools.find(school => school.id === selectedSchoolId);

  // Handle school selection
  const handleSchoolSelect = useCallback((schoolId: string) => {
    setSelectedSchoolId(schoolId);
  }, []);

  // Handle date change
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  // Handle month change
  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  }, []);

  // Handle year change
  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('schoolAnalytics.title')}</h1>
          <p className="text-muted-foreground">
            {t('schoolAnalytics.description')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p>{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-700">{t('common.error')}</h2>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-700">{t('common.noSchoolsFound')}</h2>
          <p className="mt-2 text-yellow-600">
            {t('common.noSchoolsAvailable')}
          </p>
          {user?.role === UserRole.ADMIN && (
            <Button
              className="mt-4"
              onClick={() => window.location.href = `/${user?.locale || 'en'}/schools/new`}
            >
              {t('schools.add.button')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* School selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {schools.map(school => (
              <Button
                key={school.id}
                variant={selectedSchoolId === school.id ? "default" : "outline"}
                onClick={() => handleSchoolSelect(school.id)}
              >
                {school.name}
              </Button>
            ))}
          </div>

          {selectedSchool && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* School Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedSchool.name}</CardTitle>
                    <CardDescription>
                      {selectedSchool.address}, {selectedSchool.city}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TimeRestrictionDisplay school={selectedSchool} />
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('schoolAnalytics.topProducts')}</CardTitle>
                    <CardDescription>
                      {t('schoolAnalytics.mostPopular')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingReports ? (
                      <div className="flex justify-center py-12">
                        <p>{t('common.loading')}</p>
                      </div>
                    ) : topProducts.length > 0 ? (
                      <SpendingChart
                        data={topProducts}
                        title={t('schoolAnalytics.topProducts')}
                        height={200}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <p>{t('schoolAnalytics.noProductData')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Reports Tabs */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{t('schoolAnalytics.reports')}</CardTitle>
                  <CardDescription>
                    {t('schoolAnalytics.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="daily">
                    <TabsList className="mb-4">
                      <TabsTrigger value="daily">{t('schoolAnalytics.dailyReport')}</TabsTrigger>
                      <TabsTrigger value="monthly">{t('schoolAnalytics.monthlyReport')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily">
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">{t('schoolAnalytics.selectDate')}</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={handleDateChange}
                          className="border rounded p-2"
                        />
                      </div>

                      {isLoadingReports ? (
                        <div className="flex justify-center py-12">
                          <p>{t('common.loading')}</p>
                        </div>
                      ) : dailyReport ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-500">{t('schoolAnalytics.totalOrders')}</p>
                            <p className="text-2xl font-bold">{dailyReport.total_orders}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-500">{t('schoolAnalytics.totalRevenue')}</p>
                            <p className="text-2xl font-bold">{formatCurrency(dailyReport.total_revenue)}</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-purple-500">{t('schoolAnalytics.kidsServed')}</p>
                            <p className="text-2xl font-bold">{dailyReport.total_kids_served}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p>{t('schoolAnalytics.noReport')}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="monthly">
                      <div className="mb-4 flex gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('schoolAnalytics.month')}</label>
                          <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="border rounded p-2"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month}>
                                {getMonthName(month)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('schoolAnalytics.year')}</label>
                          <select
                            value={selectedYear}
                            onChange={handleYearChange}
                            className="border rounded p-2"
                          >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {isLoadingReports ? (
                        <div className="flex justify-center py-12">
                          <p>{t('common.loading')}</p>
                        </div>
                      ) : monthlyReport ? (
                        <div className="space-y-6">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-blue-500">{t('schoolAnalytics.totalOrders')}</p>
                              <p className="text-2xl font-bold">{monthlyReport.total_orders}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm text-green-500">{t('schoolAnalytics.totalRevenue')}</p>
                              <p className="text-2xl font-bold">{formatCurrency(monthlyReport.total_revenue)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="text-sm text-purple-500">{t('schoolAnalytics.kidsServed')}</p>
                              <p className="text-2xl font-bold">{monthlyReport.total_kids_served}</p>
                            </div>
                          </div>

                          {monthlyReport.top_products && monthlyReport.top_products.length > 0 && (
                            <div>
                              <h3 className="text-lg font-medium mb-2">{t('schoolAnalytics.topProductsMonth')}</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2">{t('schoolAnalytics.product')}</th>
                                      <th className="text-right py-2">{t('schoolAnalytics.quantity')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {monthlyReport.top_products.map((product) => (
                                      <tr key={product.product_id} className="border-b">
                                        <td className="py-2">{product.product_name}</td>
                                        <td className="py-2 text-right">{product.quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p>{t('schoolAnalytics.noReport')}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default withAuth(SchoolAnalyticsPage);