"use client";

import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

/** The checkout supplies its own header and help; don't overlay the public site's chrome. */
export function EventosShell({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  if (/^\/eventos\/[^/]+\/checkout\/?$/.test(pathname)) {
    return <>{children}</>;
  }
  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}
