import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface BudgetProgressProps {
  spent: number;
  limit: number;
  className?: string;
  showRemaining?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export function BudgetProgress({
  spent,
  limit,
  className,
  showRemaining = true,
  showPercentage = true,
  size = 'md',
  title,
}: BudgetProgressProps) {
  const t = useTranslations();
  const remaining = Math.max(0, limit - spent);
  const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Determine height based on size
  const getHeight = () => {
    switch (size) {
      case 'sm': return 'h-2';
      case 'lg': return 'h-6';
      default: return 'h-4';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
  };

  return (
    <Card className={cn('w-full', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('Spent')}: {formatCurrency(spent)}</span>
          <span>{t('Limit')}: {formatCurrency(limit)}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('rounded-full', getProgressColor(), getHeight())}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          {showRemaining && (
            <span>{t('Remaining')}: {formatCurrency(remaining)}</span>
          )}
          {showPercentage && (
            <span>{percentage}%</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}