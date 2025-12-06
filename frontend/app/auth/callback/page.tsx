"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { handleGmailCallback } from "@/service/gmail/gmailService"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        
        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter')
        }

        console.log('Processing OAuth callback...')
        
        const data = await handleGmailCallback(code, state)
        
        if (data.success && data.email) {
          // Store credentials in localStorage
          if (data.access_token) {
            localStorage.setItem('gmail_access_token', data.access_token)
          }
          localStorage.setItem('gmail_email', data.email)
          
          setEmail(data.email)
          setStatus('success')
          
          // Redirect to main app after 2 seconds
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          throw new Error('Authentication failed')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed')
        setStatus('error')
      }
    }

    processCallback()
  }, [searchParams, router])

  const handleReturnToApp = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-semibold mb-2">Connecting your Gmail...</h1>
              <p className="text-muted-foreground">
                Please wait while we complete the authentication process.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h1 className="text-2xl font-semibold mb-2">Gmail Connected Successfully!</h1>
              <p className="text-muted-foreground mb-4">
                {email && `Connected to ${email}`}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                You'll be redirected to the app in a few seconds...
              </p>
              <Button onClick={handleReturnToApp} variant="default">
                Return to App
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h1 className="text-2xl font-semibold mb-2">Authentication Failed</h1>
              <p className="text-muted-foreground mb-4">
                {errorMessage || 'There was an error connecting your Gmail account.'}
              </p>
              <Button onClick={handleReturnToApp} variant="default">
                Return to App
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
