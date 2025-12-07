"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"
import { useRouter } from "next/navigation"

// Mock data structure for quotations
interface Quotation {
  id: number
  vendor: {
    id: number
    name: string
    email: string
    company: string
  }
  templateUsed: string
  sentDate: string
  responseDate?: string
  status: 'sent' | 'responded' | 'pending' | 'expired'
  quotedAmount?: number
  currency: string
  responseTime?: number // in hours
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

// Mock data for demonstration
const mockQuotations: Quotation[] = [
  {
    id: 1,
    vendor: { id: 1, name: "ABC Electronics", email: "contact@abcelectronics.com", company: "ABC Electronics Ltd" },
    templateUsed: "Standard Equipment Quote",
    sentDate: "2024-12-01",
    responseDate: "2024-12-02",
    status: "responded",
    quotedAmount: 15000,
    currency: "USD",
    responseTime: 24,
    items: [
      { description: "Laptop", quantity: 10, unitPrice: 1200, totalPrice: 12000 },
      { description: "Monitor", quantity: 10, unitPrice: 300, totalPrice: 3000 }
    ]
  },
  {
    id: 2,
    vendor: { id: 2, name: "Tech Solutions", email: "sales@techsolutions.com", company: "Tech Solutions Inc" },
    templateUsed: "Standard Equipment Quote", 
    sentDate: "2024-12-01",
    responseDate: "2024-12-03",
    status: "responded",
    quotedAmount: 14500,
    currency: "USD",
    responseTime: 48,
    items: [
      { description: "Laptop", quantity: 10, unitPrice: 1150, totalPrice: 11500 },
      { description: "Monitor", quantity: 10, unitPrice: 300, totalPrice: 3000 }
    ]
  },
  {
    id: 3,
    vendor: { id: 3, name: "Global Supplies", email: "quotes@globalsupplies.com", company: "Global Supplies Co" },
    templateUsed: "Standard Equipment Quote",
    sentDate: "2024-12-01",
    status: "pending",
    currency: "USD",
  },
  {
    id: 4,
    vendor: { id: 4, name: "Prime Vendors", email: "info@primevendors.com", company: "Prime Vendors LLC" },
    templateUsed: "Standard Equipment Quote",
    sentDate: "2024-11-28",
    status: "expired",
    currency: "USD",
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>(mockQuotations)
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>(mockQuotations)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")

  useEffect(() => {
    // Filter and sort quotations
    let filtered = quotations

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(q =>
        q.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.vendor.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.templateUsed.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(q => q.status === statusFilter)
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime()
        case "amount":
          return (b.quotedAmount || 0) - (a.quotedAmount || 0)
        case "responseTime":
          return (a.responseTime || Infinity) - (b.responseTime || Infinity)
        case "vendor":
          return a.vendor.name.localeCompare(b.vendor.name)
        default:
          return 0
      }
    })

    setFilteredQuotations(filtered)
  }, [quotations, searchTerm, statusFilter, sortBy])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'sent':
        return <Mail className="h-4 w-4 text-blue-600" />
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const respondedQuotations = quotations.filter(q => q.status === 'responded')
  const avgResponseTime = respondedQuotations.length > 0
    ? respondedQuotations.reduce((sum, q) => sum + (q.responseTime || 0), 0) / respondedQuotations.length
    : 0

  const lowestQuote = respondedQuotations.length > 0
    ? Math.min(...respondedQuotations.map(q => q.quotedAmount || Infinity))
    : 0

  const highestQuote = respondedQuotations.length > 0
    ? Math.max(...respondedQuotations.map(q => q.quotedAmount || 0))
    : 0

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
                Quotation Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Compare vendor quotations and track response metrics
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => router.push('/quotations')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Real Quotations
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{quotations.length}</span>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {quotations.length > 0 ? Math.round((respondedQuotations.length / quotations.length) * 100) : 0}%
                </span>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{Math.round(avgResponseTime)}h</span>
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Quote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  ${lowestQuote > 0 ? lowestQuote.toLocaleString() : 'N/A'}
                </span>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by vendor, company, or template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Quote Amount</SelectItem>
                  <SelectItem value="responseTime">Response Time</SelectItem>
                  <SelectItem value="vendor">Vendor Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List */}
        <div className="space-y-4">
          {filteredQuotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{quotation.vendor.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(quotation.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(quotation.status)}
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </div>
                      </Badge>
                    </div>
                    
                    <CardDescription className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {quotation.vendor.company}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {quotation.vendor.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {quotation.templateUsed}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Sent: {new Date(quotation.sentDate).toLocaleDateString()}
                      </div>
                    </CardDescription>
                  </div>
                  
                  {quotation.quotedAmount && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${quotation.quotedAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.currency}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quotation.responseDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Date</p>
                      <p className="text-lg font-semibold">
                        {new Date(quotation.responseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {quotation.responseTime && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Time</p>
                      <p className="text-lg font-semibold">{quotation.responseTime} hours</p>
                    </div>
                  )}
                  
                  {quotation.items && quotation.items.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Items Quoted</p>
                      <div className="space-y-1">
                        {quotation.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.description}</span>
                            <span className="font-medium">${item.totalPrice.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuotations.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No quotations found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "No quotations match your current filters." 
                  : "Start by sending emails to vendors to request quotations."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => router.push('/vendors')}>
                  Send Quotation Requests
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
