"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  Mail, 
  Building2, 
  User, 
  RefreshCw, 
  DollarSign,
  MessageSquare,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react"
import { getVendorQuotations, syncQuotations, VendorWithQuotations, QuotationsResponse } from "@/service/quotations/quotationService"
import { getUserTemplates, EmailTemplate } from "@/service/chat/chatService"
import { useToast } from "@/hooks/use-toast"

export default function QuotationsPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [quotationsData, setQuotationsData] = useState<QuotationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (selectedTemplateId && userEmail) {
      loadQuotations()
    }
  }, [selectedTemplateId, userEmail])

  const loadUserData = async () => {
    const storedEmail = localStorage.getItem('gmail_email')
    if (!storedEmail) {
      toast({
        title: "Error",
        description: "Please connect your Gmail account first.",
        variant: "destructive"
      })
      window.location.href = '/'
      return
    }
    
    setUserEmail(storedEmail)
    
    try {
      const templatesData = await getUserTemplates(storedEmail)
      if (templatesData.templates && templatesData.templates.length > 0) {
        setTemplates(templatesData.templates)
        setSelectedTemplateId(templatesData.templates[0].id)
      } else {
        toast({
          title: "No Templates Found", 
          description: "Create email templates first by using the chat interface.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadQuotations = async () => {
    if (!selectedTemplateId || !userEmail) return
    
    try {
      setLoading(true)
      const data = await getVendorQuotations(selectedTemplateId, userEmail)
      setQuotationsData(data)
    } catch (error) {
      console.error("Error loading quotations:", error)
      toast({
        title: "Error",
        description: "Failed to load quotations.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!selectedTemplateId || !userEmail) return
    
    try {
      setSyncing(true)
      await syncQuotations(selectedTemplateId, userEmail)
      await loadQuotations() // Reload after sync
      toast({
        title: "Sync Completed",
        description: "Quotations have been synced successfully.",
        variant: "success"
      })
    } catch (error) {
      console.error("Error syncing:", error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync quotations.",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return 'Not specified'
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency || ''
    return `${currencySymbol}${amount.toLocaleString()}`
  }

  const getVendorsWithReplies = () => {
    return quotationsData?.vendors_with_quotations.filter(v => v.quotations.length > 0) || []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading quotations...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Vendor Quotations</h1>
              <p className="text-gray-600">
                Review responses from vendors for your RFP templates
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleSync}
            disabled={syncing || !selectedTemplateId}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Replies'}
          </Button>
        </div>

        {/* Template Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedTemplateId?.toString() || ""}
              onValueChange={(value: string) => setSelectedTemplateId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <div>
                      <div className="font-medium">{template.subject}</div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(template.generated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Statistics */}
        {quotationsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                    <p className="text-2xl font-bold">{quotationsData.total_vendors_contacted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Responses</p>
                    <p className="text-2xl font-bold">{quotationsData.total_vendors_responded}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-2xl font-bold">
                      {quotationsData.total_vendors_contacted > 0 
                        ? Math.round((quotationsData.total_vendors_responded / quotationsData.total_vendors_contacted) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">
                      {quotationsData.total_vendors_contacted - quotationsData.total_vendors_responded}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quotations List */}
        {quotationsData && (
          <div className="space-y-6">
            {getVendorsWithReplies().map((vendor) => (
              <Card key={vendor.vendor_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {vendor.vendor_name}
                    </CardTitle>
                    <Badge variant="default" className="bg-green-500">
                      {vendor.quotations.length} Response{vendor.quotations.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {vendor.vendor_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {vendor.vendor_company}
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vendor.quotations.map((quotation) => (
                      <Card key={quotation.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{quotation.subject}</h4>
                              <p className="text-sm text-gray-500">
                                Received: {new Date(quotation.received_at).toLocaleString()}
                              </p>
                            </div>
                            {quotation.quoted_amount && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(quotation.quoted_amount, quotation.currency)}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                {quotation.body.substring(0, 300)}
                                {quotation.body.length > 300 && '...'}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                {quotation.is_reviewed ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Reviewed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Needs Review
                                  </Badge>
                                )}
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "View Details",
                                    description: "Detailed quotation view would open here",
                                    variant: "default"
                                  })
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {getVendorsWithReplies().length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium mb-2">No Quotations Yet</div>
                    <div className="text-sm">
                      {quotationsData.total_vendors_contacted > 0 
                        ? "Vendors haven't responded yet. Try syncing to check for new replies."
                        : "No emails have been sent for this template yet."
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
