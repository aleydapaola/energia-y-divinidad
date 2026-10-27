import { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";

import { EventosShell } from "./EventosShell";

interface EventosLayoutProps {
  children: ReactNode;
}

export default async function EventosLayout({ children }: EventosLayoutProps) {
  const session = await auth();

  return (
    <EventosShell header={<Header session={session} />} footer={<Footer />}>
      {children}
    </EventosShell>
  );
}
