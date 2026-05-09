import { useState, useCallback, useEffect, useRef } from 'react'

interface DragDropState {
  isDragging: boolean
  files: File[]
}

export interface FileAttachment {
  name: string
  type: string
  size: number
  dataUrl: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useDragDrop(onFiles?: (files: FileAttachment[]) => void) {
  const [state, setState] = useState<DragDropState>({ isDragging: false, files: [] })
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  const handleDragOver = useCallback((e: DragEvent) => {
    const hasFiles = Array.from(e.dataTransfer?.types || []).some((t) => t === 'Files')
    if (!hasFiles) return
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
    if (dropped.length > 0) {
      const validFiles = dropped.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`[DragDrop] File too large, skipped: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
          return false
        }
        return true
      })
      if (validFiles.length === 0) return
      Promise.all(
        validFiles.map(
          (file) =>
            new Promise<FileAttachment>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () =>
                resolve({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  dataUrl: reader.result as string,
                })
              reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
              reader.readAsDataURL(file)
            }),
        ),
      ).then((attachments) => {
        onFilesRef.current?.(attachments)
      }).catch((err) => {
        console.error('[DragDrop]', err)
      })
    }
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
