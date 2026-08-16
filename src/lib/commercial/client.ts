import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type {
  FinancialDocument,
  OutsourcingOrder,
  StoreCreditAccount,
  StoreCreditTransaction,
  Supplier,
  SupplierOffer,
  VisualAnalysisSession,
} from "@/lib/commercial/types";

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type CommercialDatabase = {
  public: {
    Tables: {
      suppliers: Table<Supplier>;
      store_credit_accounts: Table<StoreCreditAccount>;
      financial_documents: Table<FinancialDocument>;
      store_credit_transactions: Table<StoreCreditTransaction>;
      supplier_offers: Table<SupplierOffer>;
      outsourcing_orders: Table<OutsourcingOrder>;
      visual_analysis_sessions: Table<VisualAnalysisSession>;
    };
    Views: Record<string, never>;
    Functions: {
      prepare_store_credit_purchase: {
        Args: {
          _account_id: string;
          _document_id: string;
          _amount: number;
          _idempotency_key: string;
        };
        Returns: unknown;
      };
      confirm_store_credit_transaction: {
        Args: { _transaction_id: string };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Remove this single cast after the generated Supabase types include the commercial schema.
export const commercialSupabase = supabase as unknown as SupabaseClient<CommercialDatabase>;
