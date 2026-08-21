import { routing } from '@/i18n/routing'

export const dynamic = 'force-static'

const BASE_PATH = process.env.BASE_PATH ?? ''

export default function RootPage() {
  return <a href={`${BASE_PATH}/${routing.defaultLocale}/`}>Continue</a>
}
