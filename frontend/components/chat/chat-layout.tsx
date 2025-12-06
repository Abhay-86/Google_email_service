"use client"

import { useState, useCallback, useEffect } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatMain } from "@/components/chat/chat-main"
import { GmailConnectModal } from "@/components/chat/gmail-connect-modal"
import { SubmitChatModal } from "@/components/chat/submit-chat-modal"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { connectGmail } from "@/service/gmail/gmailService"
import { startChat, sendMessage, getChatHistory, submitChat, getAllSessions } from "@/service/chat/chatService"
import type { GmailConnectRequest, ChatMessage } from "@/types/types"

export function ChatLayout() {
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [chatSessions, setChatSessions] = useState<Array<{ id: number; title: string; created_at?: string; is_submitted?: boolean }>>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Check for stored credentials on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('gmail_email')
    const storedToken = localStorage.getItem('gmail_access_token')
    
    if (storedEmail && storedToken) {
      setUserEmail(storedEmail)
      setAccessToken(storedToken)
      setIsConnected(true)
      // Load existing sessions from backend
      loadUserSessions(storedEmail)
    }
  }, [])

  // Load sessions from backend
  const loadUserSessions = async (email: string) => {
    try {
      console.log("Loading sessions for:", email)
      const sessions = await getAllSessions(email)
      setChatSessions(sessions)
      console.log("Loaded", sessions.length, "sessions from backend")
    } catch (error) {
      console.error("Failed to load sessions:", error)
      // Fallback to localStorage if backend fails
      loadStoredSessions()
    }
  }

  // Fallback: Load sessions from localStorage
  const loadStoredSessions = () => {
    try {
      const stored = localStorage.getItem('chat_sessions')
      if (stored) {
        const sessions = JSON.parse(stored)
        setChatSessions(sessions)
        console.log("Loaded", sessions.length, "stored sessions from localStorage")
      }
    } catch (error) {
      console.error("Failed to load stored sessions:", error)
    }
  }

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chat_sessions', JSON.stringify(chatSessions))
    }
  }, [chatSessions])

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
    localStorage.removeItem('chat_sessions')
    setAccessToken(null)
    setUserEmail(null)
    setIsConnected(false)
    setMessages([])
    setChatSessions([])
    setCurrentSessionId(null)
  }

  const handleStartChat = useCallback(async () => {
    if (!isConnected || !userEmail) {
      setShowConnectModal(true)
      return
    }
    
    try {
      setIsLoading(true)
      console.log("Starting new chat session...")
      
      const response = await startChat({ email: userEmail })
      
      setCurrentSessionId(response.session_id)
      setMessages([])
      setIsSubmitted(false)
      
      // Add the new session to the list
      setChatSessions(prev => [
        { 
          id: response.session_id, 
          title: response.title || `Chat ${response.session_id}`,
          created_at: new Date().toISOString()
        },
        ...prev
      ])
      
      console.log("New chat session created:", response.session_id)
    } catch (error) {
      console.error("Failed to start chat:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, userEmail])

  const handleSendMessage = async (content: string) => {
    if (!isConnected || !content.trim() || !currentSessionId) return

    try {
      setIsLoading(true)
      
      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user" as const,
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      console.log("Sending message to session:", currentSessionId)
      
      const response = await sendMessage({
        session_id: currentSessionId,
        message: content
      })

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant" as const,
        content: response.assistant_reply,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage])
      
      console.log("Received AI response:", response.assistant_reply)
    } catch (error) {
      console.error("Failed to send message:", error)
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now() + 2,
        role: "assistant" as const,
        content: "Sorry, I encountered an error processing your message. Please try again.",
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadChatHistory = async (sessionId: number) => {
    try {
      setIsLoading(true)
      console.log("Loading chat history for session:", sessionId)
      
      const response = await getChatHistory({ session_id: sessionId })
      
      // Check if this session is submitted/closed
      if (response.is_submitted || response.is_closed) {
        console.log("Cannot load submitted/closed session")
        return
      }
      
      setCurrentSessionId(sessionId)
      // Add IDs to messages from history if they don't have them
      const messagesWithIds = response.messages?.map((msg, index) => ({
        ...msg,
        id: msg.id || `history-${sessionId}-${index}`
      })) || []
      setMessages(messagesWithIds)
      setIsSubmitted(response.is_submitted || false)
      
      console.log("Loaded", response.messages?.length || 0, "messages")
    } catch (error) {
      console.error("Failed to load chat history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitChat = async () => {
    if (!currentSessionId) return

    try {
      setIsLoading(true)
      console.log("Submitting chat session:", currentSessionId)
      
      await submitChat({ session_id: currentSessionId })
      
      setIsSubmitted(true)
      setShowSubmitModal(false)
      
      // Reload sessions to get updated status
      if (userEmail) {
        await loadUserSessions(userEmail)
      }
      
      // Clear current session since it's now submitted
      setTimeout(() => {
        setCurrentSessionId(null)
        setMessages([])
        setIsSubmitted(false)
      }, 1500) // Give user time to see the "submitted" message
      
      console.log("Chat session submitted and hidden from sidebar")
    } catch (error) {
      console.error("Failed to submit chat:", error)
      setShowSubmitModal(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitRequest = () => {
    setShowSubmitModal(true)
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
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onSelectChat={handleLoadChatHistory}
      />

      {/* Main Chat Area */}
      <ChatMain
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isConnected={isConnected}
        onStartChat={handleStartChat}
        currentSessionId={currentSessionId}
        isSubmitted={isSubmitted}
        onSubmitChat={handleSubmitRequest}
      />

      {/* Gmail Connect Modal */}
      <GmailConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleGmailConnect}
        onSuccess={handleConnectSuccess}
        isLoading={isLoading}
      />

      {/* Submit Chat Modal */}
      <SubmitChatModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmitChat}
        isLoading={isLoading}
      />
    </div>
  )
}
