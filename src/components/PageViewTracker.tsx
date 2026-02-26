"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const PV_ENDPOINT = process.env.NEXT_PUBLIC_PV_ENDPOINT;

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!PV_ENDPOINT) return;

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    // Fallback: extract domain from document.referrer
    let referrer: string | undefined;
    if (typeof document !== "undefined" && document.referrer) {
      try {
        referrer = new URL(document.referrer).hostname;
      } catch {}
    }

    const payload: Record<string, string> = { path: pathname };
    if (utmSource) payload.utm_source = utmSource;
    if (utmMedium) payload.utm_medium = utmMedium;
    if (utmCampaign) payload.utm_campaign = utmCampaign;
    if (referrer) payload.referrer = referrer;

    navigator.sendBeacon(
      `${PV_ENDPOINT}/api/pv`,
      JSON.stringify(payload)
    );
  }, [pathname, searchParams]);

  return null;
}
