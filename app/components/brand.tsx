import { Link } from "react-router";
// Inicial "G" del logo de V1, en vectores, sobre el recuadro azul de V2.
const G_PATH =
  "M3670 4930 c346 -19 617 -63 858 -137 l82 -25 0 -484 c0 -266 -1 -484 -3 -484 -2 0 -43 14 -93 30 -197 67 -363 99 -653 126 -226 20 -568 15 -706 -10 -422 -78 -662 -297 -746 -678 -40 -182 -44 -500 -8 -678 69 -348 256 -552 580 -634 237 -60 598 -50 862 24 l37 11 0 279 0 280 -385 0 -385 0 0 350 0 350 860 0 860 0 0 -973 0 -973 -127 -66 c-147 -77 -455 -185 -623 -218 -400 -81 -919 -91 -1305 -25 -177 31 -303 63 -430 110 -538 199 -894 586 -1044 1135 -127 463 -102 1117 58 1530 111 288 238 471 479 691 65 59 194 148 302 206 375 204 917 297 1530 263z";
export function Brand() {
  return (
    <Link
      className="brand inline-flex items-center text-[26px] font-[760] tracking-[-1.3px] leading-[1] min-h-11"
      to="/"
      aria-label="GastApp, inicio"
    >
      <span className="brand-mark w-[31px] h-[31px] grid place-items-center [background:var(--color-brand)] text-white mr-2.5 rounded-[9px] desktop:w-9 desktop:h-9 desktop:rounded-[11px]">
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path
            transform="translate(12 12) scale(.0038 -.0038) translate(-3015 -3015)"
            fill="currentColor"
            d={G_PATH}
          />
        </svg>
      </span>
      gastapp<span className="brand-period text-brand">.</span>
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
