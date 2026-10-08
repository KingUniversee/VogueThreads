import { redirect } from "next/navigation";

export default function StockAdjustmentsRedirect() {
  redirect("/inventory/adjustments");
}
