import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

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
      className={`button ${variant} ${className}`}
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
  return <span className={`badge badge-${tone}`}>{children}</span>;
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
        <div className="dialog-overlay" aria-hidden="true" />
        <Dialog.Content
          className="dialog-content"
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
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close asChild>
            <button
              className="icon-button dialog-close"
              aria-label="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
