"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Mail, Users, BarChart3, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is connected to Gmail
    const storedEmail = localStorage.getItem('gmail_email')
    const storedToken = localStorage.getItem('gmail_access_token')
    
    if (storedEmail && storedToken) {
      setUserEmail(storedEmail)
      setIsConnected(true)
    }
  }, [])

  const handleCreateTemplate = () => {
    if (!isConnected) {
      alert("Please connect your Gmail account first.")
      return
    }
    router.push('/chat')
  }

  const handleSendMail = () => {
    if (!isConnected) {
      alert("Please connect your Gmail account first.")
      return
    }
    router.push('/vendors')
  }

  const handleManageVendors = () => {
    if (!isConnected) {
      alert("Please connect your Gmail account first.")
      return
    }
    router.push('/vendors/manage')
  }

  const handleViewDashboard = () => {
    if (!isConnected) {
      alert("Please connect your Gmail account first.")
      return
    }
    router.push('/dashboard')
  }

  const handleConnectGmail = () => {
    router.push('/auth/gmail')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Email Vendor Management System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Streamline your vendor communication and quotation management
          </p>
          
          {isConnected ? (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✓ Connected as {userEmail}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Not connected to Gmail
              </Badge>
              <Button onClick={handleConnectGmail} variant="outline">
                Connect Gmail
              </Button>
            </div>
          )}
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Create Template Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleCreateTemplate}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <MessageSquare className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl group-hover:text-blue-600">Create Template</CardTitle>
              <CardDescription>
                Use AI-powered chat to create email templates for vendor communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• AI-assisted template generation</p>
                <p>• Customizable for different scenarios</p>
                <p>• Save and reuse templates</p>
              </div>
            </CardContent>
          </Card>

          {/* Send Mail to Vendor Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleSendMail}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Mail className="h-8 w-8 text-green-600 group-hover:text-green-700" />
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl group-hover:text-green-600">Send Mail to Vendors</CardTitle>
              <CardDescription>
                Send template-based emails to your vendors and track responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Browse vendor directory</p>
                <p>• Select email templates</p>
                <p>• Track email delivery status</p>
              </div>
            </CardContent>
          </Card>

          {/* Create/Update Vendor Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleManageVendors}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl group-hover:text-purple-600">Manage Vendors</CardTitle>
              <CardDescription>
                Create new vendors or update existing vendor information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Add new vendor profiles</p>
                <p>• Update contact information</p>
                <p>• Manage vendor categories</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Card - Full Width */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleViewDashboard}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-600 group-hover:text-orange-700" />
                <div>
                  <CardTitle className="text-xl group-hover:text-orange-600">Quotation Dashboard</CardTitle>
                  <CardDescription>
                    View and compare quotations from different vendors
                  </CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                <p>• Compare vendor quotes</p>
                <p>• Track response rates</p>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <p>• Analyze pricing trends</p>
                <p>• Generate reports</p>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <p>• Filter by categories</p>
                <p>• Export data</p>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <p>• Visual comparisons</p>
                <p>• Performance metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {isConnected && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first template or managing your vendor list
            </p>
          </div>
        )}
      </div>
    </div>
  )
}