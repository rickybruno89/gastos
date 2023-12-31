'use client'
import { CreditCardIcon, BanknotesIcon, Cog8ToothIcon, HomeIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { PAGES_URL } from '@/lib/routes'

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.

const links = [
  { name: 'Resumen', href: PAGES_URL.DASHBOARD.BASE_PATH, icon: HomeIcon },
  { name: 'Gastos', href: PAGES_URL.EXPENSES.BASE_PATH, icon: BanknotesIcon },
  {
    name: 'Tarjetas de Crédito',
    href: PAGES_URL.CREDIT_CARDS.BASE_PATH,
    icon: CreditCardIcon,
  },
  {
    name: 'Configuración',
    href: PAGES_URL.SETTINGS.BASE_PATH,
    icon: Cog8ToothIcon,
  },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center !mt-0 justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600': pathname.includes(link.href),
              }
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        )
      })}
    </>
  )
}
