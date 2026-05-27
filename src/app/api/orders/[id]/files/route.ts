import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";

const BUCKET = process.env.STORAGE_BUCKET ?? "order-files";

const fileTypeSchema = z.enum(["bom", "pnp", "gerber", "top_view"]);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const profile = await requireCurrentProfile();
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .eq("customer_id", profile.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const fileType = fileTypeSchema.safeParse(formData.get("file_type"));
  const file = formData.get("file");

  if (!fileType.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const path = `${profile.id}/${orderId}/${fileType.data}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) {
    console.error("[OrderFiles] Upload error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("order_files")
    .insert({
      order_id: orderId,
      file_type: fileType.data,
      storage_path: path,
      original_name: file.name,
      file_size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    console.error("[OrderFiles] Insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ file: data }, { status: 201 });
}
