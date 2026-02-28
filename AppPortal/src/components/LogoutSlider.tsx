'use client'

import React, { useState, useRef, useEffect, TouchEvent, MouseEvent } from 'react'
import { UserInfo } from '@/lib/redirect'

interface LogoutSliderProps {
  user: UserInfo
  onLogout: () => void
}

export default function LogoutSlider({ user, onLogout }: LogoutSliderProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [sliderWidth, setSliderWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  
  // Largura do knob (w-12 = 3rem = 48px) + padding (p-1 = 4px * 2 = 8px)
  const KNOB_WIDTH = 48 
  
  useEffect(() => {
    if (containerRef.current) {
      setSliderWidth(containerRef.current.clientWidth)
    }
  }, [])

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    startXRef.current = clientX
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    
    // Delta é negativo pois estamos arrastando para a esquerda
    const delta = clientX - startXRef.current
    
    // O máximo que podemos arrastar é a largura total menos a largura do knob
    // Como estamos indo para esquerda, o limite é negativo
    const maxTravel = sliderWidth - KNOB_WIDTH - 8 // 8px de margem de segurança
    
    // Clamp entre -maxTravel e 0
    // Só permitimos movimento para a esquerda (negativo)
    const newX = Math.min(0, Math.max(-maxTravel, delta))
    setDragX(newX)
  }

  const handleEnd = () => {
    setIsDragging(false)
    const maxTravel = sliderWidth - KNOB_WIDTH - 8
    const threshold = maxTravel * 0.5 // 50% para ativar
    
    // Se arrastou mais que o threshold (dragX é negativo, então abs)
    if (Math.abs(dragX) > threshold) {
      setDragX(-maxTravel) // Snap to end
      setTimeout(() => onLogout(), 300)
    } else {
      setDragX(0) // Snap back
    }
  }

  // Events Wrapper
  const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX)
  const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)
  
  const onMouseDown = (e: MouseEvent) => handleStart(e.clientX)
  const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
  const onMouseLeave = () => { if (isDragging) handleEnd() }

  // Calculations
  // Progress 0 (direita) -> 1 (esquerda/ativado)
  const maxDist = sliderWidth - KNOB_WIDTH - 8
  const progress = maxDist > 0 ? Math.abs(dragX) / maxDist : 0
  
  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-between bg-[var(--card)] p-1.5 rounded-[2rem] border border-[var(--card-border)] overflow-hidden select-none cursor-grab active:cursor-grabbing min-w-[220px] h-[60px] shadow-sm transition-all duration-300 hover:shadow-md"
      onMouseMove={onMouseMove}
      onMouseUp={handleEnd}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={handleEnd}
    >
      {/* Background Red Reveal Layer */}
      <div 
        className="absolute inset-0 bg-red-600 dark:bg-red-700 transition-opacity duration-75 ease-linear"
        style={{ opacity: progress }}
      />
      
      {/* Text Info (Fade Out) */}
      <div 
        className="absolute left-5 top-0 bottom-0 flex flex-col justify-center items-start transition-all duration-200 pointer-events-none z-10 max-w-[140px]"
        style={{ 
          opacity: Math.max(0, 1 - progress * 2),
          transform: `translateX(${dragX * 0.1}px)`
        }}
      >
        <p className="font-bold text-sm text-[var(--foreground)] leading-tight truncate w-full">{user.full_name}</p>
        <p className="text-[10px] text-[var(--muted)] capitalize leading-tight">{user.role.replace('_', ' ')}</p>
      </div>

      {/* Slide Text (Fade In) */}
      <div 
        className="absolute inset-0 flex items-center justify-center pl-12 pointer-events-none z-10 overflow-hidden"
        style={{ opacity: Math.max(0, (progress - 0.2) * 2) }}
      >
        <span className="text-white font-bold text-xs uppercase tracking-[0.2em] animate-pulse whitespace-nowrap">
          Solte para Sair
        </span>
      </div>

      {/* Avatar Knob (Draggable) */}
      <div
        className="relative z-20 w-12 h-12 bg-[var(--accent)] text-[var(--background)] rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-transform ml-auto"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{ 
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Bouncy snap back
        }}
      >
        {progress > 0.6 ? (
          <span className="text-red-500 bg-white rounded-full w-full h-full flex items-center justify-center">🚪</span>
        ) : (
          user.full_name.charAt(0).toUpperCase()
        )}
      </div>
    </div>
  )
}
