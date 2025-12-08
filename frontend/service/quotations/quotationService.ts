import axiosInstance from '../../utils/axiosInstance';

export interface VendorQuotation {
  id: number;
  message_id: string;
  subject: string;
  body: string;
  quoted_amount: number | null;
  currency: string | null;
  received_at: string;
  is_reviewed: boolean;
  notes: string | null;
}

export interface VendorScore {
  final_score: number;
  rank: number;
  price_score: number;
  vendor_quality_score: number;
  breakdown: {
    verification: number;
    rating: number;
    delivery: number;
    warranty: number;
    response: number;
  };
}

export interface VendorWithQuotations {
  vendor_id: number;
  vendor_name: string;
  vendor_email: string;
  vendor_company: string;
  email_sent_at: string;
  thread_id: string;
  quotations: VendorQuotation[];
  score?: VendorScore | null;  // Added score field
}

export interface QuotationsResponse {
  template: {
    id: number;
    subject: string;
    generated_at: string;
  };
  vendors_with_quotations: VendorWithQuotations[];
  total_vendors_contacted: number;
  total_vendors_responded: number;
  sync_status: string;
}

// Get all quotations for a template
export async function getVendorQuotations(templateId: number, userEmail: string): Promise<QuotationsResponse> {
  const response = await axiosInstance.get('chat/quotations/', {
    params: {
      template_id: templateId,
      user_email: userEmail
    }
  });
  return response.data;
}

// Calculate vendor scores for a template
export async function calculateVendorScores(templateId: number, userEmail: string) {
  const response = await axiosInstance.post('chat/calculate-scores/', {
    template_id: templateId,
    user_email: userEmail
  });
  return response.data;
}

// Manually trigger sync for a template
export async function syncQuotations(templateId: number, userEmail: string) {
  const response = await axiosInstance.post('chat/sync-quotations/', {
    template_id: templateId,
    user_email: userEmail
  });
  return response.data;
}

// Update quotation review status
export async function updateQuotationReview(quotationId: number, isReviewed: boolean, notes?: string) {
  // This would need to be implemented as an API endpoint
  const response = await axiosInstance.patch(`chat/quotations/${quotationId}/`, {
    is_reviewed: isReviewed,
    notes: notes
  });
  return response.data;
}
