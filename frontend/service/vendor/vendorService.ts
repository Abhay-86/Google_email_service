import axiosInstance from '../../utils/axiosInstance';
import {
  VendorCreateRequest,
  VendorUpdateRequest,
  Vendor,
} from '../../types/types';

// Get all vendors
export async function getVendors(): Promise<Vendor[]> {
  const response = await axiosInstance.get("vendors/");
  return response.data;
}

// Create new vendor
export async function createVendor(payload: VendorCreateRequest): Promise<Vendor> {
  const response = await axiosInstance.post("vendors/", payload);
  return response.data;
}

// Get vendor by ID
export async function getVendor(vendorId: number): Promise<Vendor> {
  const response = await axiosInstance.get(`vendors/${vendorId}/`);
  return response.data;
}

// Update vendor
export async function updateVendor(vendorId: number, payload: VendorUpdateRequest): Promise<Vendor> {
  const response = await axiosInstance.put(`vendors/${vendorId}/`, payload);
  return response.data;
}

// Delete vendor
export async function deleteVendor(vendorId: number): Promise<void> {
  await axiosInstance.delete(`vendors/${vendorId}/`);
}
