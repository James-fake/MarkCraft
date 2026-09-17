import { textToStorage } from '@core/storage/imageStore'

export function generateMarkdownBlob(content: string): Blob {
  const storageContent = textToStorage(content)
  return new Blob([storageContent], { type: 'text/markdown;charset=utf-8' });
}
