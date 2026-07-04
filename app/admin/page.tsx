import AdminDashboard from "../components/AdminDashboard";

export const metadata = {
  title: "어드민 대시보드 | 어뷰티",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
