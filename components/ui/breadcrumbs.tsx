import { clsx } from 'clsx';
import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

export default function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs?: Breadcrumb[];
}) {
  return (

    <nav aria-label="Breadcrumb" className="mb-6 block">
      <ul className="flex items-center h-5 flex-wrap">
        <li className="inline-flex items-center">
          <Link href="/dashboard">
            <svg className="w-5 h-auto fill-current text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z" /></svg>
          </Link>
        </li>
        {breadcrumbs?.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className={clsx("flex",
            breadcrumb.active ? 'text-blue-500' : 'text-gray-500',
          )} >
            {index <= breadcrumbs.length - 1 ? (
              <svg className="w-5 h-auto fill-current mx-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" /></svg>
            ) : null}
            <Link href={breadcrumb.href}>{breadcrumb.label}</Link>

          </li>
        )
        )}
      </ul>
    </nav>
  );
}
