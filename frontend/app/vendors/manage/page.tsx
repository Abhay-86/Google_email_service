"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  CheckCircle,
  Star,
  Award
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} from "@/service/vendor/vendorService"
import { Vendor, VendorCreateRequest, VendorUpdateRequest } from "@/types/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function VendorManagePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState<VendorCreateRequest>({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    is_email_verified: false,
    is_phone_verified: false,
    is_business_verified: false,
    overall_rating: 3.0,
    total_orders_completed: 0,
    on_time_delivery_rate: 100.0
  })

  useEffect(() => {
    loadVendors()
  }, [])

  useEffect(() => {
    // Filter vendors based on search term
    if (searchTerm.trim() === "") {
      setFilteredVendors(vendors)
    } else {
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.company && vendor.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredVendors(filtered)
    }
  }, [vendors, searchTerm])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const data = await getVendors()
      setVendors(data)
    } catch (error) {
      console.error("Error loading vendors:", error)
      toast({
        title: "Error",
        description: "Failed to load vendors. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive"
      })
      return
    }

    try {
      await createVendor(formData)
      toast({
        title: "Success",
        description: "Vendor created successfully.",
        variant: "success"
      })
      setShowCreateModal(false)
      resetForm()
      loadVendors()
    } catch (error: any) {
      console.error("Error creating vendor:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create vendor.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingVendor) return

    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive"
      })
      return
    }

    try {
      const updateData: VendorUpdateRequest = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        address: formData.address || undefined,
        // Include verification fields
        is_email_verified: formData.is_email_verified,
        is_phone_verified: formData.is_phone_verified,
        is_business_verified: formData.is_business_verified,
        // Include performance fields
        overall_rating: formData.overall_rating,
        total_orders_completed: formData.total_orders_completed,
        on_time_delivery_rate: formData.on_time_delivery_rate
      }

      await updateVendor(editingVendor.id, updateData)

      toast({
        title: "Success",
        description: `${formData.name} has been updated successfully.`,
        variant: "success"
      })

      // Close modal and reset form
      setEditingVendor(null)
      resetForm()
      loadVendors()
    } catch (error: any) {
      console.error("Error updating vendor:", error)
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to update vendor. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) {
      return
    }

    try {
      await deleteVendor(vendor.id)
      toast({
        title: "Vendor Deleted",
        description: `${vendor.name} has been deleted successfully.`,
        variant: "success"
      })
      loadVendors()
    } catch (error: any) {
      console.error("Error deleting vendor:", error)
      toast({
        title: "Delete Failed",
        description: error.response?.data?.error || "Failed to delete vendor. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone || "",
      company: vendor.company || "",
      address: vendor.address || "",
      is_email_verified: vendor.is_email_verified,
      is_phone_verified: vendor.is_phone_verified,
      is_business_verified: vendor.is_business_verified,
      overall_rating: vendor.overall_rating,
      total_orders_completed: vendor.total_orders_completed,
      on_time_delivery_rate: vendor.on_time_delivery_rate
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      is_email_verified: false,
      is_phone_verified: false,
      is_business_verified: false,
      overall_rating: 3.0,
      total_orders_completed: 0,
      on_time_delivery_rate: 100.0
    })
  }

  const handleCloseModals = () => {
    setShowCreateModal(false)
    setEditingVendor(null)
    resetForm()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Vendor Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Create, update, and manage your vendor information
              </p>
            </div>
          </div>

          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendors by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {vendor.name}
                    </CardTitle>
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {vendor.email}
                      </div>
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.company && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4" />
                          {vendor.company}
                        </div>
                      )}
                    </div>

                    {/* Verification Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vendor.is_email_verified && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Email ✓
                        </Badge>
                      )}
                      {vendor.is_phone_verified && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Phone ✓
                        </Badge>
                      )}
                      {vendor.is_business_verified && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Award className="h-3 w-3 mr-1" />
                          Business ✓
                        </Badge>
                      )}
                    </div>

                    {/* Rating and Performance */}
                    <div className="text-xs text-gray-600 mt-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{Number(vendor.overall_rating || 3.0).toFixed(1)}/5.0 Rating</span>
                      </div>
                      <div>📦 {vendor.total_orders_completed || 0} orders • {Number(vendor.on_time_delivery_rate || 100).toFixed(0)}% on-time</div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {vendor.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span className="break-words">{vendor.address}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Created: {new Date(vendor.created_at).toLocaleDateString()}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditVendor(vendor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVendor(vendor)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No vendors found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {searchTerm ? "No vendors match your search criteria." : "Get started by adding your first vendor."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Vendor
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Vendor Modal */}
        <Dialog open={showCreateModal || !!editingVendor} onOpenChange={handleCloseModals}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={editingVendor ? handleUpdateVendor : handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name" className="required">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter vendor name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="required">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Enter company name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Verification Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Verification Status</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_email_verified}
                        onChange={(e) => setFormData({ ...formData, is_email_verified: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Email Verified</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_phone_verified}
                        onChange={(e) => setFormData({ ...formData, is_phone_verified: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Phone Verified</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_business_verified}
                        onChange={(e) => setFormData({ ...formData, is_business_verified: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Business Verified</span>
                    </label>
                  </div>
                </div>

                {/* Performance Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Performance Metrics</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="rating">Overall Rating (1.0 - 5.0)</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={formData.overall_rating}
                        onChange={(e) => setFormData({ ...formData, overall_rating: parseFloat(e.target.value) || 3.0 })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="orders">Total Orders Completed</Label>
                      <Input
                        id="orders"
                        type="number"
                        min="0"
                        value={formData.total_orders_completed}
                        onChange={(e) => setFormData({ ...formData, total_orders_completed: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery">On-Time Delivery Rate (%)</Label>
                      <Input
                        id="delivery"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.on_time_delivery_rate}
                        onChange={(e) => setFormData({ ...formData, on_time_delivery_rate: parseFloat(e.target.value) || 100.0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModals}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
