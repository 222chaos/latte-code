import { useState, useCallback, useEffect, useRef } from 'react'

interface DragDropState {
  isDragging: boolean
  files: File[]
}

export function useDragDrop(onFiles?: (files: File[]) => void) {
  const [state, setState] = useState<DragDropState>({ isDragging: false, files: [] })
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setState((s) => (s.isDragging ? s : { ...s, isDragging: true }))
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (e.relatedTarget === null || !(e.relatedTarget as Element)?.closest?.('body')) {
      setState((s) => (s.isDragging ? { ...s, isDragging: false } : s))
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer?.files || [])
    setState({ isDragging: false, files: dropped })
    if (dropped.length > 0) onFilesRef.current?.(dropped)
  }, [])

  useEffect(() => {
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDragLeave, handleDrop])

  return state
}
