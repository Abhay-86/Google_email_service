"use client"

import { Plus, Mail, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  isConnected: boolean
  userEmail: string | null
  onConnectGmail: () => void
  onDisconnectGmail: () => void
  onNewChat: () => void
}

export function ChatSidebar({
  isOpen,
  onClose,
  isConnected,
  userEmail,
  onConnectGmail,
  onDisconnectGmail,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed md:relative z-50 flex flex-col h-full w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-semibold text-sidebar-foreground">Gmail AI Chat</h1>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        {isConnected && (
          <div className="p-4">
            <Button onClick={onNewChat} className="w-full justify-start gap-2 bg-transparent" variant="outline">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        )}

        {/* Chat Sessions would go here */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 p-2">
            {!isConnected ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Connect Gmail to start chatting
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ready to chat! Start a new conversation.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Gmail Connection Status */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
                <Mail className="h-4 w-4 text-green-500" />
                <span className="truncate flex-1">{userEmail}</span>
              </div>
              <Button 
                onClick={onDisconnectGmail} 
                variant="secondary" 
                size="sm"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={onConnectGmail} variant="secondary" className="w-full justify-start gap-2">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
