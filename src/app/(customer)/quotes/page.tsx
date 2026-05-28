import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile } from "@/services/auth";
import { redirect } from "next/navigation";
import QuotesClientPage from "./QuotesClientPage";
import type { QuoteStatus } from "@/types";

export default async function QuotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  const supabase = createServiceClient();

  // Fetch all quotes that belong to orders owned by the current customer
  const { data: quotesData } = await supabase
    .from("quotes")
    .select(`
      id,
      amount_lkr,
      valid_until,
      status,
      created_at,
      orders!inner (
        id,
        order_number,
        project_name,
        customer_id
      ),
      payments (
        id,
        status,
        amount_lkr
      )
    `)
    .eq("orders.customer_id", profile.id)
    .order("created_at", { ascending: false });

  // Type-cast to match what the client expects (arrays inside object due to !inner join vs relations)
  const formattedQuotes = (quotesData || []).map((q: any) => {
    // Note: 'orders' is an object because it's a many-to-one relation from quote -> order
    const orderObj = Array.isArray(q.orders) ? q.orders[0] : q.orders;
    
    return {
      id: q.id,
      amount_lkr: q.amount_lkr,
      valid_until: q.valid_until,
      status: q.status as QuoteStatus,
      created_at: q.created_at,
      orders: {
        id: orderObj.id,
        order_number: orderObj.order_number,
        project_name: orderObj.project_name,
        customer_id: orderObj.customer_id,
      },
      payments: q.payments,
    };
  });

  return <QuotesClientPage initialQuotes={formattedQuotes} />;
}
