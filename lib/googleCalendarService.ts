// Extend Window interface for TypeScript
declare global {
  interface Window {
    gapi: any
    google: any
  }
}

// Google Calendar API Service - Updated for Google Identity Services
// This service handles Google Calendar integration for appointments

interface GoogleCalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  location?: string
}

interface GoogleCalendarConfig {
  clientId: string
  apiKey: string
  discoveryDocs: string[]
  scopes: string
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig
  private gapi: any = null
  private isInitialized = false
  private accessToken: string | null = null

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      scopes: 'https://www.googleapis.com/auth/calendar'
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      console.log('Initializing Google Calendar API...')
      
      // Wait for Google API scripts to load
      await this.loadGoogleAPI()
      console.log('Google API scripts loaded')
      
      // Ensure gapi is available
      if (!this.gapi) {
        this.gapi = window.gapi
      }
      
      if (!this.gapi) {
        throw new Error('Google API not available')
      }
      
      console.log('Loading Google API client...')
      
      // Initialize the API
      await new Promise((resolve, reject) => {
        this.gapi.load('client', () => {
          console.log('Google API client loaded, initializing...')
          this.gapi.client.init({
            apiKey: this.config.apiKey,
            discoveryDocs: this.config.discoveryDocs,
          }).then(() => {
            console.log('Google API client initialized successfully')
            this.isInitialized = true
            resolve(true)
          }).catch((error: any) => {
            console.error('Google API initialization failed:', error)
            reject(error)
          })
        })
      })

      return true
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error)
      return false
    }
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google API can only be loaded in browser'))
        return
      }

      // Check if scripts are already loaded
      if (window.gapi && window.google) {
        this.gapi = window.gapi
        resolve()
        return
      }

      // Wait for scripts to load with timeout
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait
      
      const checkScripts = () => {
        attempts++
        
        if (window.gapi && window.google) {
          this.gapi = window.gapi
          resolve()
        } else if (attempts >= maxAttempts) {
          reject(new Error('Google API scripts failed to load within timeout'))
        } else {
          setTimeout(checkScripts, 100)
        }
      }

      // Start checking after a short delay
      setTimeout(checkScripts, 100)
      
      // Fallback: manually load scripts if they're not in the DOM
      setTimeout(() => {
        if (!window.gapi || !window.google) {
          this.loadScriptsManually().then(resolve).catch(reject)
        }
      }, 2000)
    })
  }

  private loadScriptsManually(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      const gsiScript = document.createElement('script')
      gsiScript.src = 'https://accounts.google.com/gsi/client'
      gsiScript.async = true
      gsiScript.defer = true
      
      // Load Google API
      const apiScript = document.createElement('script')
      apiScript.src = 'https://apis.google.com/js/api.js'
      apiScript.async = true
      apiScript.defer = true
      
      let loadedCount = 0
      const onLoad = () => {
        loadedCount++
        if (loadedCount === 2) {
          // Wait a bit for scripts to initialize
          setTimeout(() => {
            if (window.gapi && window.google) {
              this.gapi = window.gapi
              resolve()
            } else {
              reject(new Error('Scripts loaded but APIs not available'))
            }
          }, 500)
        }
      }
      
      const onError = (error: any) => {
        reject(new Error(`Failed to load Google scripts: ${error}`))
      }
      
      gsiScript.onload = onLoad
      gsiScript.onerror = onError
      apiScript.onload = onLoad
      apiScript.onerror = onError
      
      document.head.appendChild(gsiScript)
      document.head.appendChild(apiScript)
    })
  }

  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) return false
    }

    try {
      // Use Google Identity Services for authentication
      return new Promise((resolve) => {
        let resolved = false
        
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.config.clientId,
          scope: this.config.scopes,
          callback: (response: any) => {
            if (resolved) return // Prevent multiple resolutions
            
            if (response.error) {
              console.error('Authentication error:', response.error)
              if (response.error === 'access_denied') {
                alert('Access denied. Please make sure you are added as a test user in Google Cloud Console.')
              } else if (response.error === 'popup_closed_by_user') {
                console.log('User closed the authentication popup')
              } else {
                alert(`Authentication failed: ${response.error}`)
              }
              resolved = true
              resolve(false)
              return
            }
            
            if (response.access_token) {
              this.accessToken = response.access_token
              this.gapi.client.setCredentials({ access_token: this.accessToken })
              console.log('Successfully authenticated with Google Calendar')
              resolved = true
              resolve(true)
            } else {
              console.error('No access token received')
              resolved = true
              resolve(false)
            }
          }
        })

        // Try to request access token with error handling for COOP
        try {
          tokenClient.requestAccessToken()
        } catch (error) {
          console.error('Error requesting access token (COOP issue):', error)
          // If COOP blocks the popup, show a manual instruction
          alert('Popup blocked by browser security. Please:\n\n1. Allow popups for this site\n2. Or try in incognito/private mode\n3. Or use a different browser')
          resolved = true
          resolve(false)
          return
        }
        
        // Set a timeout to resolve false if no response
        setTimeout(() => {
          if (!resolved) {
            console.log('Authentication timeout - this might be due to COOP blocking the popup')
            alert('Authentication timed out. This might be due to browser security blocking the popup. Please try:\n\n1. Allowing popups for this site\n2. Using incognito/private mode\n3. Using a different browser')
            resolved = true
            resolve(false)
          }
        }, 15000) // Reduced timeout to 15 seconds
      })
    } catch (error) {
      console.error('Authentication failed:', error)
      return false
    }
  }

  async isSignedIn(): Promise<boolean> {
    return this.accessToken !== null
  }

  async signOut(): Promise<void> {
    if (this.accessToken) {
      try {
        (window as any).google.accounts.oauth2.revoke(this.accessToken)
        this.accessToken = null
        this.gapi.client.setCredentials({ access_token: null })
      } catch (error) {
        console.error('Sign out failed:', error)
      }
    }
  }

  async createEvent(eventData: GoogleCalendarEvent): Promise<any> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) throw new Error('Failed to initialize Google Calendar API')
    }

    if (!this.accessToken) {
      const authenticated = await this.authenticate()
      if (!authenticated) throw new Error('Authentication required')
    }

    try {
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: eventData
      })

      return response.result
    } catch (error) {
      console.error('Failed to create calendar event:', error)
      throw error
    }
  }

  async updateEvent(eventId: string, eventData: Partial<GoogleCalendarEvent>): Promise<any> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) throw new Error('Failed to initialize Google Calendar API')
    }

    if (!this.accessToken) {
      const authenticated = await this.authenticate()
      if (!authenticated) throw new Error('Authentication required')
    }

    try {
      const response = await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: eventData
      })

      return response.result
    } catch (error) {
      console.error('Failed to update calendar event:', error)
      throw error
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) throw new Error('Failed to initialize Google Calendar API')
    }

    if (!this.accessToken) {
      const authenticated = await this.authenticate()
      if (!authenticated) throw new Error('Authentication required')
    }

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      })
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
      throw error
    }
  }

  async getUserInfo(): Promise<any> {
    if (!this.accessToken) {
      const authenticated = await this.authenticate()
      if (!authenticated) throw new Error('Authentication required')
    }

    try {
      const response = await this.gapi.client.oauth2.userinfo.get()
      return response.result
    } catch (error) {
      console.error('Failed to get user info:', error)
      throw error
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService()

// Helper function to convert appointment to Google Calendar event
export function appointmentToGoogleEvent(appointment: any, employeeEmail?: string): GoogleCalendarEvent {
  const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // Add 1 hour by default

  return {
    summary: appointment.appointment_name,
    description: appointment.appointment_info || `Appointment for ${appointment.employee_name}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    attendees: employeeEmail ? [{
      email: employeeEmail,
      displayName: appointment.employee_name
    }] : undefined
  }
}
