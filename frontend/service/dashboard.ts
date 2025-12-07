import axiosInstance from '../utils/axiosInstance';

export interface Template {
  id: number;
  subject: string;
  template_body: string;
  session_id: number;
  generated_at: string;
}

export interface UserTemplatesResponse {
  templates: Template[];
  total: number;
}

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

export interface VendorWithQuotations {
  vendor_id: number;
  vendor_name: string;
  vendor_email: string;
  vendor_company: string;
  email_sent_at: string;
  thread_id: string;
  quotations: VendorQuotation[];
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

export interface VendorContactDetails {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
}

export interface DashboardVendor extends VendorWithQuotations {
  lowest_quotation: VendorQuotation;
  contact_details?: VendorContactDetails;
}

export interface DashboardData {
  template: Template | null;
  lowest_vendors: DashboardVendor[];
  total_vendors_contacted: number;
  total_vendors_responded: number;
}

// Get user templates (same as quotations page)
export const getUserTemplates = async (): Promise<UserTemplatesResponse> => {
  try {
    const userEmail = localStorage.getItem('gmail_email');
    if (!userEmail) {
      throw new Error('User email not found in localStorage');
    }

    const response = await axiosInstance.get('/chat/user-templates/', {
      params: { email: userEmail }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching user templates:', error);
    throw error;
  }
};

// Get quotations for a template (same as quotations page)
export const getVendorQuotations = async (templateId: number): Promise<QuotationsResponse> => {
  try {
    const userEmail = localStorage.getItem('gmail_email');
    if (!userEmail) {
      throw new Error('User email not found in localStorage');
    }

    const response = await axiosInstance.get('/chat/quotations/', {
      params: { 
        template_id: templateId,
        user_email: userEmail
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching quotations:', error);
    throw error;
  }
};

// Get vendor contact details from vendor table
export const getVendorContactDetails = async (vendorId: number): Promise<VendorContactDetails | null> => {
  try {
    const response = await axiosInstance.get('/vendors/vendors/', {
      params: { id: vendorId }
    });

    const vendors = response.data.results || [];
    const vendorData = vendors.length > 0 ? vendors[0] : null;
    
    // Debug log to check if phone number is being fetched
    console.log('Vendor data fetched:', vendorData);
    if (vendorData) {
      console.log('Phone number in vendor data:', vendorData.phone);
    }
    
    return vendorData;
  } catch (error) {
    console.error('Error fetching vendor contact details:', error);
    return null;
  }
};

// Process quotations to get top 2 vendors with lowest quotes
export const processLowestQuotations = async (quotationsResponse: QuotationsResponse): Promise<DashboardVendor[]> => {
  const vendorsWithQuotes: DashboardVendor[] = [];

  // Filter vendors that have quotations with amounts
  for (const vendor of quotationsResponse.vendors_with_quotations) {
    const validQuotations = vendor.quotations.filter(q => q.quoted_amount && q.quoted_amount > 0);
    
    if (validQuotations.length > 0) {
      // Find lowest quotation for this vendor
      const lowestQuotation = validQuotations.reduce((lowest, current) => 
        (current.quoted_amount || Infinity) < (lowest.quoted_amount || Infinity) ? current : lowest
      );

      // Get vendor contact details
      let contactDetails = null;
      try {
        contactDetails = await getVendorContactDetails(vendor.vendor_id);
      } catch (error) {
        console.error(`Error fetching contact details for vendor ${vendor.vendor_id}:`, error);
      }

      vendorsWithQuotes.push({
        ...vendor,
        lowest_quotation: lowestQuotation,
        contact_details: contactDetails || undefined
      });
    }
  }

  // Sort by lowest quotation amount and take top 2
  return vendorsWithQuotes
    .sort((a, b) => (a.lowest_quotation.quoted_amount || Infinity) - (b.lowest_quotation.quoted_amount || Infinity))
    .slice(0, 2);
};

// Get dashboard data for a specific template
export const getDashboardDataForTemplate = async (templateId: number): Promise<DashboardData> => {
  try {
    const quotationsResponse = await getVendorQuotations(templateId);
    const lowestVendors = await processLowestQuotations(quotationsResponse);
    
    // Get template details
    const templatesResponse = await getUserTemplates();
    const selectedTemplate = templatesResponse.templates.find(t => t.id === templateId) || null;

    return {
      template: selectedTemplate,
      lowest_vendors: lowestVendors,
      total_vendors_contacted: quotationsResponse.total_vendors_contacted,
      total_vendors_responded: quotationsResponse.total_vendors_responded
    };
  } catch (error) {
    console.error('Error fetching dashboard data for template:', error);
    throw error;
  }
};
