import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Note: In a real implementation, you would use a charting library like Chart.js, Recharts, or ApexCharts
// For this example, we'll create a simple bar chart visualization

interface SpendingChartProps {
  data: {
    label: string;
    value: number;
  }[];
  title: string;
  type?: 'bar' | 'line' | 'pie';
  className?: string;
  height?: number;
  currency?: string;
}

export function SpendingChart({
  data,
  title,
  type = 'bar',
  className,
  height = 200,
  currency = 'PLN'
}: SpendingChartProps) {
  const t = useTranslations();

  // Find the maximum value for scaling
  const maxValue = Math.max(...data.map(item => item.value), 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
  };

  // Render a simple bar chart
  const renderBarChart = () => {
    return (
      <div className="flex items-end h-full space-x-2">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex justify-center mb-1">
                <span className="text-xs text-gray-500 truncate">{formatCurrency(item.value)}</span>
              </div>
              <div className="w-full flex justify-center">
                <div
                  className="bg-blue-500 rounded-t w-full"
                  style={{ height: `${percentage}%` }}
                />
              </div>
              <div className="w-full text-center mt-1">
                <span className="text-xs truncate">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }} className="w-full">
          {type === 'bar' && renderBarChart()}
          {/* Add other chart types as needed */}
          {type !== 'bar' && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">{t('Chart type not implemented yet')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}