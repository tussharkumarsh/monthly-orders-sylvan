export type Channel = "Shopify" | "Amazon" | "Flipkart";

export interface Order {
  id: string;
  order_no: string;
  date: string;
  channel: Channel;
  product_name: string;
  state: string | null;
  pincode: string | null;
  shipping_through: string | null;
  tracking_number: string | null;
  product_cost: number;
  selling_price: number;
  shipping_cost: number | null;
  packing_cost: number | null;
  packing_dimension: string | null;
  packing_weight: string | null;
  profit: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcelOrderRow {
  Date: string | Date;
  "Order No": string;
  Channel: string;
  "Product Name": string;
  State: string;
  Pincode: string;
  "Shipping Through": string;
  "Tracking Number": string;
  "Product Cost": number;
  "Selling Price": number;
  "Shipping Cost": number | null;
  "Packing Cost": number | null;
  "Packing Dimension": string | null;
  "Packing Weight": string | null;
}

export interface UploadResultDetail {
  order_no: string;
  action: "added" | "updated" | "skipped";
  reason?: string;
}

export interface UploadResult {
  added: number;
  updated: number;
  skipped: number;
  details: UploadResultDetail[];
}
