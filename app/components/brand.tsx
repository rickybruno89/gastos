import { Link } from "react-router";
import { Layers2 } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="GastApp, inicio">
      <span className="brand-mark">
        <Layers2 size={23} strokeWidth={2.4} aria-hidden="true" />
      </span>
      gastapp<span className="brand-period">.</span>
    </Link>
  );
}
export function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.58-4.13H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.42 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.32-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.59C7.2 7.71 9.4 5.95 12 5.95Z"
      />
    </svg>
  );
}
