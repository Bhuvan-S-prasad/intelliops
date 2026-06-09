import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { checkUploadLimit } from '@/lib/rate-limit'
import { uploadFile } from '@/lib/storage'
import { processFile } from '@/lib/processor'
import {
  getWorkspaceFilesCache,
  setWorkspaceFilesCache,
  invalidateWorkspaceFilesCache,
} from '@/lib/cache'
import { randomUUID } from 'crypto'

// Allowed MIME types and mapping to database extensions & FileType
const MIME_TYPE_MAP: Record<
  string,
  { ext: string; type: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG' }
> = {
  'application/pdf': { ext: 'pdf', type: 'PDF' },
  'text/csv': { ext: 'csv', type: 'CSV' },
  'application/json': { ext: 'json', type: 'JSON' },
  'text/plain': { ext: 'txt', type: 'TXT' },
  'text/x-log': { ext: 'log', type: 'LOG' },
}

// Helper to validate file content by checking actual binary bytes
async function validateFileBytes(buffer: Buffer, mimeType: string): Promise<boolean> {
  if (mimeType === 'application/pdf') {
    // PDF signature: starts with %PDF (hex: 25 50 44 46)
    const header = buffer.toString('ascii', 0, 4)
    return header === '%PDF'
  }

  if (mimeType === 'application/json') {
    try {
      JSON.parse(buffer.toString('utf-8'))
      return true
    } catch {
      return false
    }
  }

  if (
    mimeType === 'text/csv' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/x-log'
  ) {
    // Valid text file should not contain null bytes (binary indicator)
    if (buffer.includes(0)) return false
    return true
  }

  return false
}

type FileResponseItem = {
  id: string
  name: string
  originalName: string
  fileType: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG'
  sizeBytes: number
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
  chunkCount: number | null
  createdAt: string
  uploadedBy: {
    name: string | null
    avatarUrl: string | null
  }
}

// GET /api/workspaces/[workspaceId]/files
// Get workspace files, cached for 60 seconds
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // Enforce authentication & membership checks (at least USER role)
    await requireWorkspaceAccess(workspaceId, 'USER')

    // Check files list cache first
    const cachedFiles = await getWorkspaceFilesCache<FileResponseItem[]>(workspaceId)
    if (cachedFiles) {
      return Response.json({ files: cachedFiles })
    }

    // Retrieve workspace files from Prisma
    const dbFiles = await prisma.file.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalName: true,
        fileType: true,
        sizeBytes: true,
        status: true,
        chunkCount: true,
        createdAt: true,
        uploadedBy: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    const files: FileResponseItem[] = dbFiles.map((f) => ({
      id: f.id,
      name: f.name,
      originalName: f.originalName,
      fileType: f.fileType,
      sizeBytes: f.sizeBytes,
      status: f.status,
      chunkCount: f.chunkCount,
      createdAt: f.createdAt.toISOString(),
      uploadedBy: {
        name: f.uploadedBy.name,
        avatarUrl: f.uploadedBy.avatarUrl,
      },
    }))

    // Save retrieval list to cache
    await setWorkspaceFilesCache<FileResponseItem[]>(workspaceId, files, 60)

    return Response.json({ files })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/files error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workspaces/[workspaceId]/files
// Rate-limited, byte-validated file upload handler
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. Authenticate and verify workspace access (must be ADMIN or OWNER)
    const { user } = await requireWorkspaceAccess(workspaceId, 'ADMIN')

    // 2. Perform rate-limiting using Upstash Redis
    const rateCheck = await checkUploadLimit(user.id)
    if (!rateCheck.success) {
      const retryAfter = Math.ceil((rateCheck.reset - Date.now()) / 1000)
      return Response.json(
        { error: 'Upload limit reached', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // 3. Parse form body
    const formData = await req.formData()
    const fileEntry = formData.get('file')

    if (!fileEntry || !(fileEntry instanceof File)) {
      return Response.json({ error: 'No file uploaded in form data' }, { status: 400 })
    }

    // 4. Validate file attributes
    const sizeBytes = fileEntry.size
    if (sizeBytes > 50 * 1024 * 1024) {
      return Response.json({ error: 'File size exceeds maximum limit of 50MB' }, { status: 400 })
    }

    const mimeType = fileEntry.type
    const typeMapping = MIME_TYPE_MAP[mimeType]
    if (!typeMapping) {
      return Response.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }

    // 5. Read file bytes and validate content by magic signatures
    const fileArrayBuffer = await fileEntry.arrayBuffer()
    const buffer = Buffer.from(fileArrayBuffer)

    const isValid = await validateFileBytes(buffer, mimeType)
    if (!isValid) {
      return Response.json({ error: 'File validation failed: magic bytes do not match mime-type' }, { status: 400 })
    }

    // 6. Generate storage key
    const fileUUID = randomUUID()
    const storageKey = `workspaces/${workspaceId}/files/${fileUUID}.${typeMapping.ext}`

    // 7. Upload file to Supabase object bucket
    await uploadFile(storageKey, buffer, mimeType)

    // 8. Create database records & log audit entry in a transaction
    const newFile = await prisma.$transaction(async (tx) => {
      const dbFile = await tx.file.create({
        data: {
          workspaceId,
          uploadedById: user.id,
          name: fileEntry.name,
          originalName: fileEntry.name,
          fileType: typeMapping.type,
          mimeType,
          sizeBytes,
          storageKey,
          status: 'QUEUED',
        },
      })

      // Log the upload action
      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: user.id,
          action: 'file.upload',
          metadata: {
            fileId: dbFile.id,
            fileName: dbFile.name,
            sizeBytes,
          },
        },
      })

      return dbFile
    })

    // 9. Invalidate cache on upload
    await invalidateWorkspaceFilesCache(workspaceId)

    // 10. Trigger background document parser job (non-awaited)
    void processFile(newFile.id)

    return Response.json(
      {
        file: {
          id: newFile.id,
          name: newFile.name,
          status: newFile.status,
          fileType: newFile.fileType,
          sizeBytes: newFile.sizeBytes,
          createdAt: newFile.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/files error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
