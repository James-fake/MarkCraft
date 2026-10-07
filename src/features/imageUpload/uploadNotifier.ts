export type UploadStatus = 'uploading' | 'success' | 'error'

export interface UploadNotification {
  id: string
  status: UploadStatus
  message: string
  url?: string
}

type Listener = (notification: UploadNotification) => void

const listeners: Listener[] = []

export function subscribeUploadStatus(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

export function notifyUploadStatus(notification: UploadNotification): void {
  listeners.forEach(l => l(notification))
}
