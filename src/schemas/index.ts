import { z } from "zod";

export const signUpSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^[0-9+\s\-()]{9,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const orderStep1Schema = z.object({
  project_name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name is too long"),
  units: z
    .number({ invalid_type_error: "Units must be a number" })
    .int("Units must be a whole number")
    .min(1, "Minimum 1 unit")
    .max(20, "Maximum 20 units per order"),
  assembly_type: z.enum(["smt_only", "through_hole_only", "mixed"], {
    required_error: "Please select an assembly type",
  }),
  inspection_level: z.enum(["standard", "detailed"], {
    required_error: "Please select an inspection level",
  }),
  customer_notes: z.string().max(500).optional(),
  discount_token: z.string().max(20).optional(),
});

export const orderStep3Schema = z.object({
  sourcing_option: z.enum(["protonest", "customer"]),
  allow_equivalents: z.boolean().optional(),
  customer_supplied_note: z.string().max(500).optional(),
  ship_together: z.boolean().optional(),
  expected_arrival: z.string().optional(),
});

export const createQuoteSchema = z.object({
  order_id: z.string().uuid(),
  amount_lkr: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount seems too large"),
  customer_notes: z.string().max(1000).nullable().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
  valid_days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(7),
});

export const updateStatusSchema = z.object({
  order_id: z.string().uuid(),
  new_status: z.enum([
    "quote_pending",
    "quote_ready",
    "payment_completed",
    "components_received",
    "in_assembly",
    "inspection",
    "ready_for_delivery",
    "delivered",
  ]),
  note: z.string().max(500).nullable().optional(),
  expected_delivery: z.string().nullable().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OrderStep1Input = z.infer<typeof orderStep1Schema>;
export type OrderStep3Input = z.infer<typeof orderStep3Schema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export const issueDiscountTokenSchema = z.object({
  discount_type: z.enum(["fixed", "percentage"]),
  discount_value: z
    .number({ invalid_type_error: "Discount value must be a number" })
    .positive("Discount value must be greater than 0"),
  valid_days: z.number().int().min(1).max(365).default(90),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type IssueDiscountTokenInput = z.infer<typeof issueDiscountTokenSchema>;
