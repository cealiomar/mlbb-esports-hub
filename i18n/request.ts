import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { EGYPT_TIME_ZONE } from '@/lib/time/egypt'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = routing.locales.includes(requested as never)
    ? (requested as string)
    : routing.defaultLocale

  return {
    locale,
    timeZone: EGYPT_TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
