"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { connectGmail } from "@/service/gmail/gmailService"
import { GmailConnectRequest } from "@/types/types"
import { useToast } from "@/hooks/use-toast"

export default function GmailAuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check if already connected
    const storedEmail = localStorage.getItem('gmail_email')
    const storedToken = localStorage.getItem('gmail_access_token')
    
    if (storedEmail && storedToken) {
      setIsConnected(true)
      setEmail(storedEmail)
    }

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const storedEmailForCallback = localStorage.getItem('gmail_email_pending')
    
    if (code && storedEmailForCallback) {
      handleOAuthCallback(code, storedEmailForCallback)
    }
  }, [])

  const handleOAuthCallback = async (code: string, emailForCallback: string) => {
    try {
      setIsLoading(true)
      // Here you would typically send the code to your backend
      // For now, we'll simulate successful connection
      localStorage.setItem('gmail_email', emailForCallback)
      localStorage.setItem('gmail_access_token', 'mock_token')
      localStorage.removeItem('gmail_email_pending')
      
      setIsConnected(true)
      setEmail(emailForCallback)
      setError(null)
      
      toast({
        title: "Gmail Connected!",
        description: "Your Gmail account has been successfully connected.",
        variant: "success"
      })
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error("OAuth callback error:", error)
      setError("Failed to complete Gmail connection. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log("Connecting Gmail with email:", email)
      
      const payload: GmailConnectRequest = { email: email.trim() }
      console.log("Payload:", payload)
      
      const data = await connectGmail(payload)
      console.log("Response from backend:", data)
      
      if (data.auth_url) {
        console.log("Redirecting to:", data.auth_url)
        // Store email for callback
        localStorage.setItem('gmail_email_pending', email.trim())
        // Redirect to Google OAuth
        window.location.href = data.auth_url
      } else if (data.connected) {
        console.log("Already connected")
        localStorage.setItem('gmail_email', email.trim())
        localStorage.setItem('gmail_access_token', 'connected')
        setIsConnected(true)
        setError(null)
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error: any) {
      console.error("Failed to connect Gmail:", error)
      setError(
        error.response?.data?.message || 
        error.message || 
        "Failed to connect Gmail. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('gmail_email')
    localStorage.removeItem('gmail_access_token')
    localStorage.removeItem('gmail_email_pending')
    setIsConnected(false)
    setEmail("")
    setError(null)
  }

  if (isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-xl">Gmail Connected Successfully!</CardTitle>
              <CardDescription>
                Your Gmail account is now connected and ready to use.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connected as:
                </p>
                <p className="font-medium text-lg">{email}</p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => router.push('/')} 
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
                
                <Button 
                  onClick={handleDisconnect} 
                  variant="outline" 
                  className="w-full"
                >
                  Disconnect Gmail
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Connect Your Gmail Account</CardTitle>
            <CardDescription>
              Connect your Gmail account to start sending emails to vendors and managing quotations.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <Label htmlFor="email">Gmail Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your Gmail address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Connecting...
                  </div>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Gmail
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>• We'll redirect you to Google to authorize access</p>
                <p>• We only access emails related to vendor communications</p>
                <p>• You can disconnect at any time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
