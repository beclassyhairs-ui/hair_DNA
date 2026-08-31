import ProductManager from "../../components/admin/ProductManager";

export const metadata = {
  title: "제품 관리 | 미알팁 어드민",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <ProductManager />;
}
