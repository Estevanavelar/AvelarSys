import { useCallback, useEffect, useRef, useState } from 'react'

type NotificationMessage = {
  type: string
  title?: string
  message?: string
  data?: Record<string, any>
  timestamp?: string
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookie = `; ${document.cookie}`
  const parts = cookie.split(`; ${name}=`)
  if (parts.length < 2) return null
  const value = parts.pop()?.split(';').shift()
  return value ? decodeURIComponent(value) : null
}

export function useWebSocket({ enabled = true }: { enabled?: boolean } = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<NotificationMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!enabled) return
    const token = localStorage.getItem('avelar_token') || getCookieValue('avelar_token')
    if (!token) return

    try {
      if (wsRef.current) {
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          return
        }
        wsRef.current.close()
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/ws`
      const wsUrl = `${baseUrl}?token=${encodeURIComponent(token)}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: NotificationMessage = JSON.parse(event.data)
          setLastMessage(message)
        } catch (error) {
          console.error('WebSocket parse error:', error)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        wsRef.current = null

        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Falha ao conectar com o servidor de notificações')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Erro na conexão com o servidor de notificações')
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setConnectionError('Erro ao criar conexão WebSocket')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close()
        }
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect, enabled])

  return {
    isConnected,
    lastMessage,
    connectionError,
  }
}
