import BulkTagger from "../../components/admin/BulkTagger";

export const metadata = {
  title: "일괄 태깅 | 어뷰티 어드민",
  robots: { index: false, follow: false },
};

export default function AdminBulkTagPage() {
  return <BulkTagger />;
}
