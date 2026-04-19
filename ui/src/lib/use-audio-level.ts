import { useEffect, useRef, useState } from 'react'

export function useAudioLevel(audioElement: HTMLAudioElement | null | undefined) {
  const [level, setLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!audioElement) {
      setLevel(0)
      return
    }

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext

    // Create analyser
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    analyserRef.current = analyser

    // Connect audio element to analyser
    try {
      const source = audioContext.createMediaElementSource(audioElement)
      sourceRef.current = source
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    } catch (error) {
      // Already connected, ignore
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    // Sample audio data
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate average level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalized = average / 255 // 0 to 1
      
      setLevel(normalized)
      animationRef.current = requestAnimationFrame(updateLevel)
    }

    animationRef.current = requestAnimationFrame(updateLevel)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioElement])

  return level
}
