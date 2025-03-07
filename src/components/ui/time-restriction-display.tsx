import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { School } from '@/types';

interface TimeRestrictionDisplayProps {
  school: School;
  className?: string;
  showTitle?: boolean;
}

export function TimeRestrictionDisplay({
  school,
  className,
  showTitle = true,
}: TimeRestrictionDisplayProps) {
  const t = useTranslations();

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDay = new Date().getDay();

  // Map day number to property name
  const dayToProperty = {
    0: 'sunday_enabled',
    1: 'monday_enabled',
    2: 'tuesday_enabled',
    3: 'wednesday_enabled',
    4: 'thursday_enabled',
    5: 'friday_enabled',
    6: 'saturday_enabled',
  };

  // Check if school is open today
  const isOpenToday = school[dayToProperty[currentDay as keyof typeof dayToProperty]];

  // Format time (HH:MM)
  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return timeString;
  };

  // Calculate next available day
  const getNextAvailableDay = () => {
    let nextDay = currentDay;
    for (let i = 1; i <= 7; i++) {
      nextDay = (nextDay + 1) % 7;
      if (school[dayToProperty[nextDay as keyof typeof dayToProperty]]) {
        return nextDay;
      }
    }
    return null; // No available days
  };

  // Get day name
  const getDayName = (day: number) => {
    const days = [
      t('Sunday'),
      t('Monday'),
      t('Tuesday'),
      t('Wednesday'),
      t('Thursday'),
      t('Friday'),
      t('Saturday'),
    ];
    return days[day];
  };

  // Get next available day message
  const getNextAvailableDayMessage = () => {
    const nextDay = getNextAvailableDay();
    if (nextDay === null) {
      return t('No available ordering days');
    }
    return `${t('Next available day')}: ${getDayName(nextDay)}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      {showTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Ordering Hours')}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium text-gray-500">{t('Opening Hour')}</p>
            <p className="text-lg font-semibold">{formatTime(school.opening_hour)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t('Closing Hour')}</p>
            <p className="text-lg font-semibold">{formatTime(school.closing_hour)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{t('Available Days')}</p>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <div
                key={day}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium',
                  school[dayToProperty[day as keyof typeof dayToProperty]]
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-400'
                )}
                title={getDayName(day)}
              >
                {getDayName(day).charAt(0)}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className={cn(
            'text-sm font-medium',
            isOpenToday ? 'text-green-600' : 'text-red-600'
          )}>
            {isOpenToday
              ? t('Ordering is available today')
              : getNextAvailableDayMessage()
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}