import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { isAdminProfile, requireCurrentProfile } from "@/services/auth";

const BUCKET = process.env.STORAGE_BUCKET ?? "order-files";
const EXPIRY = Number(process.env.SIGNED_URL_EXPIRY ?? 3600);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params;
  const profile = await requireCurrentProfile();
  const service = createServiceClient();

  const { data: file } = await service
    .from("order_files")
    .select("id, storage_path, original_name, order_id")
    .eq("id", fileId)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (!isAdminProfile(profile)) {
    const { data: order } = await service
      .from("orders").select("customer_id").eq("id", file.order_id).single();
    if (!order || order.customer_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: signed, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, EXPIRY);

  if (error || !signed) {
    console.error("[Files] Signed URL error:", error);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  // Redirect to signed URL
  return NextResponse.redirect(signed.signedUrl);
}
