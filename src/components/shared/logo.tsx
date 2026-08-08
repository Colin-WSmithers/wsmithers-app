import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The mark is the "WS" monogram cropped out of the full lockup; the full
 * lockup (monogram + wordmark + EST. 1955) is used on the login screen where
 * there's room to breathe.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/mark.png"
      alt=""
      width={360}
      height={260}
      priority
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="W. Smithers &amp; Sons — est. 1955"
      width={751}
      height={449}
      priority
      className={cn("h-auto w-44 object-contain", className)}
    />
  );
}
