import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './settings';

export default getRequestConfig(async () => {
  return {
    locale: defaultLocale,
    messages: {
      // Provide empty messages as a fallback
      // The actual messages will be loaded in the layout component
    }
  };
});

export type Messages = typeof import('../messages/en.json');