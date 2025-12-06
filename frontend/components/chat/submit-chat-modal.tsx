"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SubmitChatModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}

export function SubmitChatModal({ isOpen, onClose, onConfirm, isLoading }: SubmitChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit and Close Chat?</DialogTitle>
          <DialogDescription>
            This will finalize your chat session and send the conversation for processing. 
            Once submitted, you won't be able to add more messages to this chat.
            <br /><br />
            Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Submitting..." : "Submit Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
