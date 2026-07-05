import type { ReactNode } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <AdminSidebar />
      <main className="md:pl-60">{children}</main>
    </div>
  );
}
