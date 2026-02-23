"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PV_ENDPOINT = process.env.NEXT_PUBLIC_PV_ENDPOINT;

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PV_ENDPOINT) return;
    navigator.sendBeacon(
      `${PV_ENDPOINT}/api/pv`,
      JSON.stringify({ path: pathname })
    );
  }, [pathname]);

  return null;
}
