import { ManualPaymentPreviewNotice } from "@/components/pago/ManualPaymentPreviewNotice";
import { isProductionEnvironment } from "@/lib/preview-safety";

export default function WompiPendingLayout({ children }: { children: React.ReactNode }) {
  return isProductionEnvironment() ? children : <ManualPaymentPreviewNotice />;
}
