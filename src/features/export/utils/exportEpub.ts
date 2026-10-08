// Markdown → EPUB via Pandoc (desktop/Electron only)
// Falls back to a simple HTML-based EPUB if Pandoc is unavailable

import { renderMarkdown } from '@services/sanitizeHtml'
import { platform } from '@platform'

interface PandocResult {
  success: boolean
  buffer?: ArrayBuffer
  error?: string
}

// Call Pandoc through the platform layer (desktop = main-process sidecar; browser = unavailable)
async function callPandoc(content: string, fromFormat: string, toFormat: string): Promise<PandocResult> {
  try {
    if (!(await platform.pandoc.available())) {
      return { success: false, error: 'Pandoc not available' }
    }
    const result = await platform.pandoc.convert(content, fromFormat, toFormat)
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { success: true, buffer: result.buffer }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Pandoc conversion failed' }
  }
}

// Simple EPUB generator (fallback without Pandoc)
// Creates a minimal valid EPUB 3.0 file
async function generateSimpleEpub(content: string): Promise<Blob> {
  // M-1：导出物也经净化闸门，避免恶意 HTML 进入 EPUB。
  const htmlBody = renderMarkdown(content, { gfm: true, breaks: true, async: false })

  const uuid = 'urn:uuid:' + crypto.randomUUID()
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  // EPUB is a ZIP file. We'll build it manually using the browser's Compression API.
  const files: { name: string; content: string | Uint8Array }[] = []

  // mimetype must be first and stored uncompressed
  files.push({ name: 'mimetype', content: 'application/epub+zip' })

  // META-INF/container.xml
  files.push({
    name: 'META-INF/container.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  })

  // OEBPS/content.opf
  files.push({
    name: 'OEBPS/content.opf',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uuid}</dc:identifier>
    <dc:title>Exported Document</dc:title>
    <dc:language>zh</dc:language>
    <meta property="dcterms:modified">${timestamp}</meta>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`,
  })

  // OEBPS/nav.xhtml
  files.push({
    name: 'OEBPS/nav.xhtml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
<nav epub:type="toc">
  <h1>Table of Contents</h1>
  <ol><li><a href="chapter1.xhtml">Document</a></li></ol>
</nav>
</body>
</html>`,
  })

  // OEBPS/chapter1.xhtml
  files.push({
    name: 'OEBPS/chapter1.xhtml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Document</title></head>
<body>
${htmlBody}
</body>
</html>`,
  })

  // Build ZIP using Compression Streams API
  const zipBuffer = await buildZip(files)
  return new Blob([zipBuffer], { type: 'application/epub+zip' })
}

// Minimal ZIP file builder
async function buildZip(files: { name: string; content: string | Uint8Array }[]): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const entries: { name: Uint8Array; data: Uint8Array; compressed: Uint8Array; crc: number }[] = []

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content
    const compressed = await compressDeflate(dataBytes)
    const crc = crc32(dataBytes)
    entries.push({ name: nameBytes, data: dataBytes, compressed, crc })
  }

  // Calculate sizes
  let offset = 0
  const localHeaders: Uint8Array[] = []
  const centralHeaders: Uint8Array[] = []

  for (const entry of entries) {
    const isMimetype = new TextDecoder().decode(entry.name) === 'mimetype'
    const useStored = isMimetype // mimetype must be stored (not compressed)
    const compressedSize = useStored ? entry.data.length : entry.compressed.length
    const uncompressedSize = entry.data.length

    // Local file header
    const localHeader = new Uint8Array(30 + entry.name.length)
    const lhView = new DataView(localHeader.buffer)
    lhView.setUint32(0, 0x04034b50, true) // signature
    lhView.setUint16(4, 20, true) // version needed
    lhView.setUint16(6, 0, true) // flags
    lhView.setUint16(8, useStored ? 0 : 8, true) // compression: stored or deflate
    lhView.setUint16(10, 0, true) // mod time
    lhView.setUint16(12, 0, true) // mod date
    lhView.setUint32(14, entry.crc, true) // crc32
    lhView.setUint32(18, useStored ? 0 : compressedSize, true) // compressed size (may need zip64)
    lhView.setUint32(22, uncompressedSize, true) // uncompressed size
    lhView.setUint16(26, entry.name.length, true) // filename length
    lhView.setUint16(28, 0, true) // extra field length
    localHeader.set(entry.name, 30)

    const fileData = useStored ? entry.data : entry.compressed
    localHeaders.push(localHeader)
    localHeaders.push(fileData)

    // Central directory header
    const centralHeader = new Uint8Array(46 + entry.name.length)
    const chView = new DataView(centralHeader.buffer)
    chView.setUint32(0, 0x02014b50, true) // signature
    chView.setUint16(4, 20, true) // version made by
    chView.setUint16(6, 20, true) // version needed
    chView.setUint16(8, 0, true) // flags
    chView.setUint16(10, useStored ? 0 : 8, true) // compression
    chView.setUint16(12, 0, true) // mod time
    chView.setUint16(14, 0, true) // mod date
    chView.setUint32(16, entry.crc, true) // crc32
    chView.setUint32(20, useStored ? 0 : compressedSize, true) // compressed size
    chView.setUint32(24, uncompressedSize, true) // uncompressed size
    chView.setUint16(28, entry.name.length, true) // filename length
    chView.setUint16(30, 0, true) // extra field length
    chView.setUint16(32, 0, true) // comment length
    chView.setUint16(34, 0, true) // disk number
    chView.setUint16(36, 0, true) // internal attrs
    chView.setUint32(38, 0, true) // external attrs
    chView.setUint32(42, offset, true) // local header offset
    centralHeader.set(entry.name, 46)

    centralHeaders.push(centralHeader)

    offset += 30 + entry.name.length + (useStored ? entry.data.length : entry.compressed.length)
  }

  const centralDirOffset = offset
  let centralDirSize = 0
  for (const ch of centralHeaders) centralDirSize += ch.length

  // End of central directory
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true) // signature
  eocdView.setUint16(4, 0, true) // disk number
  eocdView.setUint16(6, 0, true) // disk with central dir
  eocdView.setUint16(8, entries.length, true) // entries on disk
  eocdView.setUint16(10, entries.length, true) // total entries
  eocdView.setUint32(12, centralDirSize, true) // central dir size
  eocdView.setUint32(16, centralDirOffset, true) // central dir offset
  eocdView.setUint16(20, 0, true) // comment length

  // Combine all parts
  const totalSize = offset + centralDirSize + 22
  const result = new Uint8Array(totalSize)
  let pos = 0
  for (const part of localHeaders) {
    result.set(part, pos)
    pos += part.length
  }
  for (const ch of centralHeaders) {
    result.set(ch, pos)
    pos += ch.length
  }
  result.set(eocd, pos)

  return result.buffer
}

// Compress data using Deflate (Compression Streams API)
async function compressDeflate(data: Uint8Array): Promise<Uint8Array> {
  try {
    const cs = new CompressionStream('deflate-raw')
    const writer = cs.writable.getWriter()
    const reader = cs.readable.getReader()

    writer.write(new Uint8Array(data) as unknown as BufferSource)
    writer.close()

    const chunks: Uint8Array[] = []
    let totalLen = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLen += value.length
    }

    const result = new Uint8Array(totalLen)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  } catch {
    // Fallback: store uncompressed
    return data
  }
}

// CRC32 calculation
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

export async function generateEpubBlob(content: string): Promise<Blob> {
  // Try Pandoc first (desktop sidecar; unavailable in browser)
  const result = await callPandoc(content, 'markdown', 'epub')
  if (result.success && result.buffer) {
    return new Blob([new Uint8Array(result.buffer as ArrayBuffer)], { type: 'application/epub+zip' })
  }

  // Fallback: generate simple EPUB without Pandoc
  return generateSimpleEpub(content)
}
