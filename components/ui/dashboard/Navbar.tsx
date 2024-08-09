'use client'
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  BanknotesIcon,
  Bars3Icon,
  Cog8ToothIcon,
  CreditCardIcon,
  HomeIcon,
  PowerIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Session } from 'next-auth'
import Image from 'next/image'
import { PAGES_URL } from '@/lib/routes'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

const navigation = [
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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <Disclosure as="div" className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-14 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button*/}
            <DisclosureButton
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className=" group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Abrir menu</span>
              <Bars3Icon aria-hidden="true" className="block h-6 w-6 group-data-[open]:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden h-6 w-6 group-data-[open]:block" />
            </DisclosureButton>
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center">
              <h1 className="text-white text-xl font-bold">GastApp</h1>
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={pathname.includes(item.href) ? 'page' : undefined}
                    className={classNames(
                      pathname.includes(item.href)
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium'
                    )}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <div>
                <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Abrir menu usuario</span>
                  <Image
                    className="h-8 w-8 rounded-full"
                    priority
                    width={100}
                    height={100}
                    src={session?.user?.image as string}
                    alt="profile picture"
                  />
                </MenuButton>
              </div>
              <MenuItems
                transition
                className="p-1 absolute right-0 z-10 mt w-48 origin-top-right rounded-md bg-white  shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <MenuItem>
                  <div className="flex items-center gap-2 text-sm p-2 text-gray-800 data-[focus]:bg-orange-500 data-[focus]:text-white rounded-md">
                    <PowerIcon className="w-5" />
                    <button
                      onClick={async () => {
                        await signOut({
                          callbackUrl: '/',
                        })
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden absolute w-full h-[calc(100dvh)] bg-[#FFFFFFAA] backdrop-blur-md z-10">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              aria-current={pathname.includes(item.href) ? 'page' : undefined}
              className={classNames(
                pathname.includes(item.href) ? 'bg-orange-500 text-white' : ' hover:bg-gray-700 hover:text-white',
                'text-black block text-base font-medium p-2 rounded-md'
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}
