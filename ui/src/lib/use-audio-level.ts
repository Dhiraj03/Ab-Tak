import { useEffect, useRef, useState } from 'react'

export function useAudioLevel(audioElement: HTMLAudioElement | null | undefined) {
  const [level, setLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const isSetupRef = useRef(false)

  useEffect(() => {
    if (!audioElement || isSetupRef.current) {
      if (!audioElement) {
        setLevel(0)
        isSetupRef.current = false
      }
      return
    }

    console.log('Setting up audio analysis for:', audioElement.src?.slice(0, 50))

    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) {
      console.warn('AudioContext not supported')
      return
    }

    const audioContext = new AudioContextClass()
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
      console.log('Audio connected successfully')
      isSetupRef.current = true
    } catch (error) {
      console.error('Error connecting audio:', error)
      return
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed')
      })
    }

    // Sample audio data
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let frameCount = 0

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate average level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalized = average / 255 // 0 to 1
      
      setLevel(normalized)
      
      // Log every 60 frames (~1 second)
      frameCount++
      if (frameCount % 60 === 0) {
        console.log('Audio level:', normalized.toFixed(3))
      }
      
      animationRef.current = requestAnimationFrame(updateLevel)
    }

    animationRef.current = requestAnimationFrame(updateLevel)

    return () => {
      console.log('Cleaning up audio analysis')
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      isSetupRef.current = false
    }
  }, [audioElement])

  return level
}
