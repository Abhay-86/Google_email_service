"use client"

import { useRef, useEffect } from "react"
import { ChatMessageBubble } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { EmptyState } from "@/components/chat/empty-state"

interface ChatMainProps {
  messages: any[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  isConnected: boolean
  onStartChat: () => void
}

export function ChatMain({
  messages,
  onSendMessage,
  isLoading,
  isConnected,
  onStartChat,
}: ChatMainProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <main className="flex-1 flex flex-col h-full">
      {!isConnected ? (
        <EmptyState onStartChat={onStartChat} isConnected={isConnected} />
      ) : (
        <>
          {/* Header */}
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h2 className="font-medium text-foreground">Gmail AI Chat</h2>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-4 overflow-y-auto" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Start a conversation with your Gmail AI assistant!
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessageBubble key={message.id} message={message} />
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-foreground">AI</span>
                    </div>
                    <div className="flex-1 bg-muted rounded-2xl rounded-tl-none p-4">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={onSendMessage} isLoading={isLoading} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
