"use client"

import { MessageSquare, Sparkles, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onStartChat: () => void
  isConnected: boolean
}

export function EmptyState({ onStartChat, isConnected }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2 text-center text-balance">
        Welcome to Gmail AI Chat
      </h2>

      <p className="text-muted-foreground text-center max-w-md mb-8 text-pretty">
        {!isConnected 
          ? "Connect your Gmail account to start chatting with our AI assistant about your emails."
          : "Start a new conversation with our AI assistant to manage your Gmail."
        }
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {isConnected ? (
          <Button onClick={onStartChat} size="lg" className="gap-2">
            <MessageSquare className="h-5 w-5" />
            Start New Chat
          </Button>
        ) : (
          <Button onClick={onStartChat} size="lg" className="gap-2">
            <Mail className="h-5 w-5" />
            Connect Gmail to Start
          </Button>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl">
        <div className="p-4 rounded-xl bg-muted/50">
          <MessageSquare className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-medium text-foreground mb-1">Smart Conversations</h3>
          <p className="text-sm text-muted-foreground">Chat naturally with our AI assistant</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <Mail className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-medium text-foreground mb-1">Gmail Integration</h3>
          <p className="text-sm text-muted-foreground">Connect Gmail to manage emails</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <Sparkles className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-medium text-foreground mb-1">AI Powered</h3>
          <p className="text-sm text-muted-foreground">Get intelligent responses instantly</p>
        </div>
      </div>
    </div>
  )
}
