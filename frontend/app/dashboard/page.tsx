"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText,
  Clock,
  Trophy,
  Medal,
  User,
  MessageSquare,
  Phone,
  MapPin,
  Calculator,
  Award,
  Star
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  getUserTemplates,
  getDashboardDataForTemplate,
  calculateVendorScores,
  Template,
  DashboardData
} from "@/service/dashboard"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (selectedTemplateId && userEmail) {
      loadDashboardData()
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
      const templatesData = await getUserTemplates()
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

  const loadDashboardData = async () => {
    if (!selectedTemplateId) return

    try {
      setLoading(true)
      const data = await getDashboardDataForTemplate(selectedTemplateId)

      // Debug log to check vendor contact details
      console.log('Dashboard data received:', data)
      data.lowest_vendors.forEach((vendor: any, index: number) => {
        console.log(`Vendor ${index + 1} contact details:`, vendor.contact_details)
        console.log(`Vendor ${index + 1} phone:`, vendor.contact_details?.phone)
      })

      setDashboardData(data)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateScores = async () => {
    if (!selectedTemplateId) return

    try {
      setCalculating(true)
      const result = await calculateVendorScores(selectedTemplateId)
      await loadDashboardData() // Reload to show scores
      toast({
        title: "Scores Calculated",
        description: `Successfully calculated scores for ${result.scores_calculated} vendors. Top ranked: ${result.top_ranked?.vendor_name}`,
        variant: "default"
      })
    } catch (error) {
      console.error("Error calculating scores:", error)
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate vendor scores.",
        variant: "destructive"
      })
    } finally {
      setCalculating(false)
    }
  }

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return 'Not specified'
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency || ''
    return `${currencySymbol}${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard data...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                Vendor Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                View top 2 vendors with lowest quotations for each template
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleCalculateScores}
              disabled={calculating || !selectedTemplateId}
            >
              <Calculator className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculating...' : 'Calculate Scores'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/quotations')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View All Quotations
            </Button>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Template Selection */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Select Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedTemplateId?.toString() || ""}
              onValueChange={(value: string) => setSelectedTemplateId(parseInt(value))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template, index) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <div>
                      <div className="font-medium">
                        Template #{index + 1}: {template.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Vendors Contacted</p>
                    <p className="text-2xl font-bold">{dashboardData.total_vendors_contacted}</p>
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
                    <p className="text-2xl font-bold">{dashboardData.total_vendors_responded}</p>
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
                      {dashboardData.total_vendors_contacted > 0
                        ? Math.round((dashboardData.total_vendors_responded / dashboardData.total_vendors_contacted) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 text-orange-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Top Vendors</p>
                    <p className="text-2xl font-bold">{dashboardData.lowest_vendors.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top 2 Vendors with Lowest Quotations */}
        {dashboardData && dashboardData.lowest_vendors.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-yellow-500" />
                {dashboardData.lowest_vendors[0]?.score ? 'Top Ranked Vendors by Score' : 'Top 2 Vendors with Lowest Quotations'}
              </CardTitle>
              <CardDescription>
                {dashboardData.lowest_vendors[0]?.score
                  ? 'Vendors ranked by combined price (50%) and quality (50%) score'
                  : `Vendors ranked by their lowest quotation amount for: ${dashboardData.template?.subject}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dashboardData.lowest_vendors.map((vendor, index) => (
                  <Card
                    key={vendor.vendor_id}
                    className={`border-l-4 bg-gray-900 border-gray-600 ${index === 0 ? 'border-l-yellow-500' : 'border-l-gray-400'
                      }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : 'bg-gray-500'
                            }`}>
                            {index + 1}
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 text-white">
                              <User className="h-4 w-4" />
                              {vendor.vendor_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-4 text-sm mt-2">
                              <span className="flex items-center gap-1 text-gray-300">
                                <Building2 className="h-3 w-3" />
                                {vendor.vendor_company}
                              </span>
                              <span className="flex items-center gap-1 text-gray-300">
                                <Mail className="h-3 w-3" />
                                {vendor.vendor_email}
                              </span>
                            </CardDescription>
                          </div>
                        </div>

                        <div className="text-right">
                          {vendor.score ? (
                            <div>
                              <div className="flex items-center gap-2 justify-end mb-1">
                                <Award className={`h-5 w-5 ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                                <div className={`text-3xl font-bold ${vendor.score.final_score >= 80 ? 'text-green-600' :
                                  vendor.score.final_score >= 60 ? 'text-yellow-600' : 'text-gray-600'
                                  }`}>
                                  {vendor.score.final_score.toFixed(1)}
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">Score / 100</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Rank #{vendor.score.rank}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className={`text-2xl font-bold ${index === 0 ? 'text-yellow-600' : 'text-gray-600'
                                }`}>
                                {formatCurrency(vendor.lowest_quotation.quoted_amount, vendor.lowest_quotation.currency)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Lowest Quote
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Vendor Contact Details */}
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200">{vendor.contact_details?.email || vendor.vendor_email}</span>
                        </div>

                        {vendor.contact_details?.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-200">{vendor.contact_details.phone}</span>
                          </div>
                        )}

                        {vendor.contact_details?.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-200">{vendor.contact_details.address}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200">{vendor.contact_details?.company || vendor.vendor_company}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200">{vendor.contact_details?.name || vendor.vendor_name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200">{vendor.quotations.length} Quotation{vendor.quotations.length !== 1 ? 's' : ''} Received</span>
                        </div>
                      </div>

                      {/* Vendor Information */}
                      <div className="bg-gray-800 p-4 rounded border border-gray-600">
                        <h5 className="font-medium text-sm text-gray-100 mb-3">Vendor Information:</h5>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contact Person</p>
                              <p className="text-sm font-semibold text-white">{vendor.contact_details?.name || vendor.vendor_name}</p>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Company</p>
                              <p className="text-sm font-semibold text-white">{vendor.contact_details?.company || vendor.vendor_company}</p>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p>
                              <p className="text-sm text-gray-200">{vendor.contact_details?.email || vendor.vendor_email}</p>
                            </div>

                            {vendor.contact_details?.phone && (
                              <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</p>
                                <p className="text-sm text-gray-200">{vendor.contact_details.phone}</p>
                              </div>
                            )}
                          </div>

                          {vendor.contact_details?.address && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Address</p>
                              <p className="text-sm text-gray-200">{vendor.contact_details.address}</p>
                            </div>
                          )}

                          <div className="border-t border-gray-600 pt-3 mt-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-300">Quotation Amount:</span>
                              <span className="font-bold text-lg text-green-400">
                                {formatCurrency(vendor.lowest_quotation.quoted_amount, vendor.lowest_quotation.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-gray-300">Received:</span>
                              <span className="text-white">{new Date(vendor.lowest_quotation.received_at).toLocaleDateString()}</span>
                            </div>
                            {vendor.lowest_quotation.notes && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</p>
                                <p className="text-sm text-gray-200 italic">{vendor.lowest_quotation.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Score Breakdown */}
                          {vendor.score && (
                            <div className="border-t border-gray-600 pt-3 mt-3">
                              <h6 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Score Breakdown</h6>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">💰 Price Score (50%):</span>
                                  <span className="font-semibold text-white">{vendor.score.price_score.toFixed(1)}/100</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">⭐ Quality Score (50%):</span>
                                  <span className="font-semibold text-white">{vendor.score.vendor_quality_score.toFixed(1)}/100</span>
                                </div>
                                <div className="h-px bg-gray-600 my-1"></div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300 font-semibold">Final Score:</span>
                                  <span className={`font-bold text-lg ${vendor.score.final_score >= 80 ? 'text-green-400' :
                                      vendor.score.final_score >= 60 ? 'text-yellow-400' : 'text-gray-400'
                                    }`}>{vendor.score.final_score.toFixed(1)}/100</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
                          <Badge variant={vendor.lowest_quotation.is_reviewed ? "default" : "outline"}
                            className={vendor.lowest_quotation.is_reviewed
                              ? "bg-green-600 text-white"
                              : "border-gray-500 text-gray-300"}>
                            {vendor.lowest_quotation.is_reviewed ? "Reviewed" : "Needs Review"}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-500 text-gray-200 hover:bg-gray-700 hover:text-white"
                            onClick={() => router.push('/quotations')}
                          >
                            View Email Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {dashboardData && dashboardData.lowest_vendors.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Quotations Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {dashboardData.total_vendors_contacted > 0
                  ? "No vendors have provided quotations with amounts yet."
                  : "No emails have been sent for this template yet."}
              </p>
              <Button onClick={() => router.push('/quotations')}>
                View Quotations Page
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
