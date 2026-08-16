export type Supplier = {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  whatsapp: string | null;
  active: boolean;
};

export type StoreCreditAccount = {
  id: string;
  company_id: string;
  supplier_id: string;
  opening_balance: number;
  current_balance: number;
};

export type FinancialDocument = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  file_name: string;
  storage_path: string;
  document_hash: string;
  document_number: string | null;
  document_date: string | null;
  total_amount: number | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  status: string;
};

export type StoreCreditTransaction = {
  id: string;
  account_id: string;
  company_id: string;
  document_id: string | null;
  kind: string;
  amount: number;
  previous_balance: number;
  new_balance: number;
  status: string;
  created_at: string;
};

export type SupplierOffer = {
  id: string;
  company_id: string;
  supplier_id: string;
  product_name: string;
  normalized_product: string;
  brand: string | null;
  unit: string;
  package_quantity: number;
  unit_price: number;
  shipping_cost: number;
  valid_until: string | null;
  source_document_id: string | null;
};

export type OutsourcingOrder = {
  id: string;
  company_id: string;
  project_id: string | null;
  supplier_id: string;
  order_number: string;
  status: string;
  freight_amount: number;
  requested_due_date: string | null;
  sent_at: string | null;
  xml_file_id: string | null;
  message_text: string | null;
  created_by: string;
};

export type VisualAnalysisSession = {
  id: string;
  company_id: string;
  project_id: string | null;
  file_name: string;
  storage_path: string;
  purpose: string;
  status: string;
  method: string;
  created_at: string;
};

export type CommercialProject = {
  id: string;
  name: string;
};

export type ProjectXmlFile = {
  id: string;
  project_id: string;
  file_name: string;
};
