"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"

interface EmailPreview {
  subject: string
  body: string
}

interface SubmitChatModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onFinalSubmit: (subject: string, body: string) => void
  isLoading: boolean
  emailPreview: EmailPreview | null
  step: 'confirm' | 'preview'
}

export function SubmitChatModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onFinalSubmit, 
  isLoading, 
  emailPreview,
  step 
}: SubmitChatModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (emailPreview) {
      setSubject(emailPreview.subject)
      setBody(emailPreview.body)
    }
  }, [emailPreview])

  const handleFinalSubmit = () => {
    onFinalSubmit(subject, body)
  }

  if (step === 'confirm') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit and Close Chat?</DialogTitle>
            <DialogDescription>
              This will generate an email template based on your conversation and allow you to preview it.
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
              {isLoading ? "Generating..." : "Generate Email Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Template Preview</DialogTitle>
          <DialogDescription>
            Review and edit the generated email template before finalizing the submission.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content"
              className="mt-1 min-h-[300px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFinalSubmit} 
            disabled={isLoading || !subject.trim() || !body.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
