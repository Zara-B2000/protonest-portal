import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile } from "@/services/auth";
import { redirect } from "next/navigation";
import OrdersClientPage from "./OrdersClientPage";

export default async function OrdersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  const supabase = createServiceClient();

  const { data: ordersData } = await supabase
    .from("orders")
    .select(`
      id, order_number, project_name, units, assembly_type,
      status, expected_delivery, created_at,
      quotes(amount_lkr, status),
      payments(status, amount_lkr)
    `)
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });

  return <OrdersClientPage initialOrders={ordersData || []} />;
}
