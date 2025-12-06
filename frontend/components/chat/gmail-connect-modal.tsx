"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GmailConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (email: string) => void
  onSuccess: (email: string) => void
  isLoading: boolean
}

export function GmailConnectModal({ isOpen, onClose, onConnect, onSuccess, isLoading }: GmailConnectModalProps) {
  const [email, setEmail] = useState("")

  const handleConnect = async () => {
    if (!email) return
    
    try {
      await onConnect(email)
    } catch (error) {
      console.error("Failed to connect:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connect Your Gmail
          </DialogTitle>
          <DialogDescription>
            Connect your Gmail account to start chatting with AI assistance. You'll be redirected to Google for authentication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button onClick={handleConnect} className="w-full gap-2" disabled={!email || isLoading}>
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Connect with Google
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
