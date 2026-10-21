import { cn } from "../lib/cn";
import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const buttonVariants = {
  primary:
    "primary text-white [background:var(--color-brand)] shadow-[0_3px_6px_#3458dd18] [&:hover:not(:disabled)]:[background:var(--color-brand-hover)]",
  secondary:
    "secondary [background:white] text-[#354156] shadow-[0_1px_2px_#162b4a05] border-[#dce2ed] [&:hover:not(:disabled)]:[background:#f7f9fd] [&:hover:not(:disabled)]:border-muted",
  ghost:
    "ghost [background:transparent] text-brand [&:hover:not(:disabled)]:[background:var(--color-brand-soft)]",
};
const badgeTones = {
  neutral: "badge-neutral",
  blue: "badge-blue text-info [background:#edf2ff]",
  green: "badge-green text-success [background:#eaf7f0]",
  amber: "badge-amber text-warning [background:#fff5df]",
  red: "badge-red text-danger [background:#fdefef]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type="button"
      className={cn(
        "button inline-flex items-center justify-center min-h-11 text-[0.875rem] font-semibold whitespace-nowrap px-4 py-2.5 border border-solid border-transparent rounded-[9px] gap-[9px]",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  return (
    <span
      className={cn(
        "badge inline-flex items-center w-fit text-[11px] leading-[1.35] font-[550] [background:#f0f3f7] text-muted px-2 py-[5px] rounded-[6px] gap-[5px]",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const syncViewport = useCallback(() => {
    const viewport = window.visualViewport;
    const node = content.current;
    if (!node) return;
    if (!viewport || viewport.scale !== 1) {
      node.style.removeProperty("--visible-height");
      node.style.removeProperty("--keyboard-offset");
      return;
    }
    node.style.setProperty("--visible-height", `${viewport.height}px`);
    node.style.setProperty(
      "--keyboard-offset",
      `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`,
    );
  }, []);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [open, syncViewport]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* El bloqueo de scroll vive en CSS para respetar la CSP sin estilos inyectados. */}
        <div
          className="dialog-overlay fixed top-0 right-0 bottom-0 left-0 z-[50] [background:#14223e66] [backdrop-filter:blur(5px)] animate-fade-in pointer-events-auto touch-none"
          aria-hidden="true"
        />
        <Dialog.Content
          className="dialog-content fixed z-[51] left-0 top-auto [transform:none] w-full max-w-none max-h-[calc(_var(--visible-height,_100dvh)_-_max(12px,_env(safe-area-inset-top))_)] overflow-hidden flex flex-col py-2 [background:white] rounded-tl-[24px] rounded-tr-[24px] rounded-br-none rounded-bl-none shadow-[0_25px_80px_#101e4a33] animate-fade-in right-0 bottom-[var(--keyboard-offset,_0px)] desktop:left-1/2 desktop:top-1/2 desktop:[transform:translate(-50%,_-50%)] desktop:w-[480px] desktop:max-w-[calc(100vw_-_32px)] desktop:max-h-[calc(100dvh_-_32px)] desktop:right-auto desktop:bottom-auto desktop:rounded-[20px]"
          ref={(node) => {
            content.current = node;
            if (node) syncViewport();
          }}
          onOpenAutoFocus={(event) => {
            opener.current = document.activeElement as HTMLElement | null;
            if (window.matchMedia("(max-width: 900px)").matches) {
              event.preventDefault();
              content.current?.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <div className="dialog-scroll min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scroll-padding-block:80px] pt-[17px] pr-[max(20px,_env(safe-area-inset-right))] pb-[calc(12px_+_env(safe-area-inset-bottom))] pl-[max(20px,_env(safe-area-inset-left))] desktop:px-[31px] desktop:py-[23px] [&>h2]:text-[1.3125rem] [&>h2]:pr-9.5 [&>p]:text-[0.8125rem] [&>p]:text-muted [&>p]:mt-2.5 [&>p]:mb-5.5 [&>p]:leading-[1.7] [&>p]:mx-0">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
            {children}
          </div>
          <Dialog.Close asChild>
            <button
              className="icon-button dialog-close [background:transparent] w-11 min-h-11 inline-flex justify-center items-center absolute top-3 right-[max(12px,_env(safe-area-inset-right))] text-muted p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FormField({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "form-field flex flex-col mb-5.5 gap-2 [&_label]:text-[0.875rem] [&_label]:font-[550] [&_label]:text-[#53637b] [&_input]:[background:white] [&_input]:min-h-12 [&_input]:text-[max(16px,_1rem)] [&_input]:text-[#3d4c65] [&_input]:w-full [&_input]:px-3 [&_input]:py-2.5 [&_input]:border [&_input]:border-solid [&_input]:border-[#dce3ef] [&_input]:rounded-[8px] [&_select]:[background:white] [&_select]:min-h-12 [&_select]:text-[max(16px,_1rem)] [&_select]:text-[#3d4c65] [&_select]:w-full [&_select]:px-3 [&_select]:py-2.5 [&_select]:border [&_select]:border-solid [&_select]:border-[#dce3ef] [&_select]:rounded-[8px] [&_input::placeholder]:text-muted",
        className,
      )}
      {...props}
    />
  );
}
