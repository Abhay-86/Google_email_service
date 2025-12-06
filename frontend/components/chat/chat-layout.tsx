"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatMain } from "@/components/chat/chat-main"
import { GmailConnectModal } from "@/components/chat/gmail-connect-modal"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { connectGmail, handleGmailCallback } from "@/service/gmail/gmailService"
import type { GmailConnectRequest } from "@/types/types"

export function ChatLayout() {
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])

  // Check for stored credentials on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('gmail_email')
    const storedToken = localStorage.getItem('gmail_access_token')
    
    if (storedEmail && storedToken) {
      setUserEmail(storedEmail)
      setAccessToken(storedToken)
      setIsConnected(true)
    }
  }, [])

  const handleGmailConnect = async (email: string) => {
    try {
      setIsLoading(true)
      console.log("Connecting Gmail with email:", email)
      const payload: GmailConnectRequest = { email }
      console.log("Payload:", payload)
      
      const data = await connectGmail(payload)
      console.log("Response from backend:", data)
      
      if (data.auth_url) {
        console.log("Redirecting to:", data.auth_url)
        // Redirect to Google OAuth
        window.location.href = data.auth_url
      } else if (data.connected) {
        console.log("Already connected")
        setIsConnected(true)
        setUserEmail(email)
        setShowConnectModal(false)
      }
    } catch (error) {
      console.error("Failed to connect Gmail:", error)
      console.error("Error details:")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnectGmail = () => {
    localStorage.removeItem('gmail_access_token')
    localStorage.removeItem('gmail_email')
    setAccessToken(null)
    setUserEmail(null)
    setIsConnected(false)
    setMessages([])
  }

  const handleStartChat = useCallback(async () => {
    if (!isConnected) {
      setShowConnectModal(true)
      return
    }
    
    // Initialize chat functionality here
    console.log("Starting chat with Gmail connected")
  }, [isConnected])

  const handleSendMessage = async (content: string) => {
    if (!isConnected || !content.trim()) return

    const userMessage = {
      id: Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Add AI response logic here
    // For now, just echo back
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant", 
        content: `I received your message: "${content}". Gmail integration is ready!`,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  const handleConnectSuccess = (email: string) => {
    setUserEmail(email)
    setIsConnected(true)
    setShowConnectModal(false)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isConnected={isConnected}
        userEmail={userEmail}
        onConnectGmail={() => setShowConnectModal(true)}
        onDisconnectGmail={handleDisconnectGmail}
        onNewChat={handleStartChat}
      />

      {/* Main Chat Area */}
      <ChatMain
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isConnected={isConnected}
        onStartChat={handleStartChat}
      />

      {/* Gmail Connect Modal */}
      <GmailConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleGmailConnect}
        onSuccess={handleConnectSuccess}
        isLoading={isLoading}
      />
    </div>
  )
}
