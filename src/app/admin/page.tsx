import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = {
  title: "Admin - mcw999-hub",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPage />;
}
