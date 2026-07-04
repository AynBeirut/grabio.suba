"use client"

import { useEffect, useRef } from 'react'

export function VersionChecker() {
  const initialBuildTime = useRef<string | null>(null)

  useEffect(() => {
    // Get initial build time from header
    const getBuildTime = async () => {
      try {
        const response = await fetch('/', { method: 'HEAD', cache: 'no-store' })
        const buildTime = response.headers.get('X-Build-Time')
        
        if (!initialBuildTime.current && buildTime) {
          initialBuildTime.current = buildTime
        } else if (initialBuildTime.current && buildTime && buildTime !== initialBuildTime.current) {
          // New deployment detected - force reload
          console.log('🔄 New version detected, reloading...')
          window.location.reload()
        }
      } catch (error) {
        // Silently fail
      }
    }

    // Check every 30 seconds
    const interval = setInterval(getBuildTime, 30000)
    getBuildTime() // Initial check

    return () => clearInterval(interval)
  }, [])

  return null
}
