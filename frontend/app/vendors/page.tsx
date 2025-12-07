"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Mail, Building2, Phone, User, CheckCircle, AlertCircle, Search } from "lucide-react"
import { getChatVendors, getUserTemplates, sendTemplateEmail, EmailTemplate } from "@/service/chat/chatService"
import { ChatVendor, EmailStats } from "@/types/types"
import { useToast } from "@/hooks/use-toast"

export default function VendorsPage() {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<ChatVendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<ChatVendor[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sentVendors, setSentVendors] = useState<Set<number>>(new Set())
  const [sendingVendor, setSendingVendor] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    // Filter vendors based on search term
    if (searchTerm.trim() === "") {
      setFilteredVendors(vendors)
    } else {
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.company && vendor.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredVendors(filtered)
    }
  }, [vendors, searchTerm])

  const loadUserData = async () => {
    // Get user email from localStorage
    const storedEmail = localStorage.getItem('gmail_email')
    if (!storedEmail) {
      alert("Please connect your Gmail account first.")
      window.location.href = '/'
      return
    }
    
    setUserEmail(storedEmail)
    await Promise.all([
      loadUserTemplates(storedEmail)
    ])
    // Don't load vendors yet - wait for template selection
  }

  const loadUserTemplates = async (email: string) => {
    try {
      console.log('Loading user templates for:', email)
      const data = await getUserTemplates(email)
      
      console.log('Templates API response:', data)
      
      if (data.templates && data.templates.length > 0) {
        setTemplates(data.templates)
        // Auto-select the most recent template
        setSelectedTemplateId(data.templates[0].id)
      } else {
        console.log("No templates found for user")
        toast({
          title: "No Templates Found",
          description: "Please create an email template first by using the chat interface.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading user templates:", error)
      toast({
        title: "Error Loading Templates",
        description: "Failed to load email templates. Please try again.",
        variant: "destructive"
      })
    }
  }

  const loadVendors = async () => {
    if (!selectedTemplateId || !userEmail) {
      setLoading(false)
      return
    }
    
    try {
      console.log('Loading vendors for template:', selectedTemplateId)
      const data = await getChatVendors(selectedTemplateId, userEmail)
      
      console.log('Vendors API response:', data)
      
      const vendorsData = data.vendors || []
      console.log('Setting vendors:', vendorsData.length, vendorsData)
      setVendors(vendorsData)
      
      // Set email stats if available
      if (data.email_stats) {
        setEmailStats(data.email_stats)
      }
      
      // Update sent vendors based on email status
      const alreadySentVendorIds = vendorsData
        .filter(vendor => vendor.email_status === 'sent')
        .map(vendor => vendor.id)
      setSentVendors(new Set(alreadySentVendorIds))
      
    } catch (error) {
      console.error("Error loading vendors:", error)
      toast({
        title: "Error Loading Vendors",
        description: "Failed to load vendors. Please try again.",
        variant: "destructive"
      })
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  // Load vendors when template is selected
  useEffect(() => {
    if (selectedTemplateId && userEmail) {
      setLoading(true)
      loadVendors()
    }
  }, [selectedTemplateId, userEmail])

  const sendEmailToVendor = async (vendorId: number) => {
    if (!selectedTemplateId || !userEmail) {
      toast({
        title: "Missing Information",
        description: "Please select a template first.",
        variant: "destructive"
      })
      return
    }

    const vendor = vendors.find(v => v.id === vendorId)
    
    try {
      setSendingVendor(vendorId)
      
      const result = await sendTemplateEmail({
        vendor_id: vendorId,
        template_id: selectedTemplateId,
        user_email: userEmail
      })

      if (result.success) {
        setSentVendors(prev => new Set([...prev, vendorId]))
        toast({
          title: "Email Sent Successfully!",
          description: `Email sent to ${vendor?.name || 'vendor'} (${vendor?.email})`,
          variant: "success"
        })
        console.log(`Email sent successfully to vendor ${vendorId}`)
      } else {
        console.error("Failed to send email:", result.message)
        toast({
          title: "Failed to Send Email",
          description: result.message || `Failed to send email to ${vendor?.name}`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast({
        title: "Error Sending Email",
        description: error.response?.data?.message || "An error occurred while sending the email. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingVendor(null)
    }
  }

  const goBackToChat = () => {
    window.location.href = '/'
  }

  const finishSending = () => {
    toast({
      title: "Email Campaign Completed!",
      description: `Successfully sent emails to ${sentVendors.size} vendor${sentVendors.size === 1 ? '' : 's'}.`,
      variant: "success"
    })
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading vendors...</div>
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
            <Button variant="outline" onClick={goBackToChat}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Send RFP to Vendors</h1>
              <p className="text-gray-600">
                Select vendors to send your RFP email template
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Emails sent</div>
            <div className="text-xl font-bold">{sentVendors.size} / {vendors.length}</div>
            {sentVendors.size > 0 && (
              <Button 
                className="mt-2" 
                onClick={finishSending}
                variant="default"
              >
                Finish & Return
              </Button>
            )}
          </div>
        </div>

        {/* Template Selection and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Email Template</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
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
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>No templates found.</p>
                  <p className="text-sm">Please complete a chat session first.</p>
                </div>
              )}
              {userEmail && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Sender:</span> {userEmail}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Vendors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, company, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Showing {filteredVendors.length} of {vendors.length} vendors
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Statistics */}
        {emailStats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Email Campaign Progress</CardTitle>
              <CardDescription>Statistics for template: "{emailStats.template_subject}"</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{emailStats.sent_count}</div>
                  <div className="text-sm text-gray-500">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{emailStats.failed_count}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{emailStats.remaining_count}</div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{emailStats.total_vendors}</div>
                  <div className="text-sm text-gray-500">Total Vendors</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(((emailStats.sent_count + emailStats.failed_count) / emailStats.total_vendors) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{width: `${((emailStats.sent_count + emailStats.failed_count) / emailStats.total_vendors) * 100}%`}}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors
            .filter(vendor => vendor.email_status !== 'sent') // Hide sent vendors
            .map((vendor) => {
            const isSent = sentVendors.has(vendor.id)
            const isSending = sendingVendor === vendor.id
            
            return (
              <Card key={vendor.id} className={`relative ${isSent ? 'bg-green-50 border-green-200' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {vendor.name}
                    </CardTitle>
                    {isSent && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{vendor.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{vendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{vendor.phone}</span>
                  </div>
                  
                  <div className="pt-3">
                    <Button
                      className="w-full"
                      onClick={() => sendEmailToVendor(vendor.id)}
                      disabled={isSent || isSending}
                      variant={isSent ? "outline" : "default"}
                    >
                      {isSending ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : isSent ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Email Sent
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredVendors.length === 0 && vendors.length > 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No Vendors Found</div>
                <div className="text-sm">
                  No vendors match your search criteria. Try a different search term.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {vendors.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No Vendors Found</div>
                <div className="text-sm">
                  Please add vendors to the database first.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
