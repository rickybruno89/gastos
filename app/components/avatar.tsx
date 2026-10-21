import { useState } from "react";
import { cn } from "../lib/cn";

// Foto de la cuenta de Google; si no hay o no carga, la inicial del nombre.
export function Avatar({
  name,
  image,
  className,
}: {
  name?: string;
  image?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "avatar [background:#e9effe] text-[#4f6bbd] inline-grid size-[35px] shrink-0 place-content-center overflow-hidden text-[11px] font-semibold border-[3px] border-solid border-[#f4f7ff] rounded-full",
        className,
      )}
    >
      {image && !failed ? (
        <img
          src={image}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{name?.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
