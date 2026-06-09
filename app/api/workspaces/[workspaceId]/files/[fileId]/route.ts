import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { getSignedDownloadUrl, deleteFile } from '@/lib/storage'
import { invalidateWorkspaceFilesCache } from '@/lib/cache'

// GET /api/workspaces/[workspaceId]/files/[fileId]
// Retrieve single file details and generate a signed download URL
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; fileId: string }> }
) {
  const { workspaceId, fileId } = await params

  try {
    // 1. Verify user has at least USER permission in the workspace
    await requireWorkspaceAccess(workspaceId, 'USER')

    // 2. Fetch the file metadata from the database
    const file = await prisma.file.findUnique({
      where: {
        id: fileId,
        workspaceId,
      },
      include: {
        uploadedBy: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!file) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    // 3. Generate a signed Supabase download URL valid for 1 hour (3600 seconds)
    const downloadUrl = await getSignedDownloadUrl(file.storageKey, 3600)

    return Response.json({
      file: {
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        fileType: file.fileType,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        status: file.status,
        errorMessage: file.errorMessage,
        chunkCount: file.chunkCount,
        pageCount: file.pageCount,
        createdAt: file.createdAt.toISOString(),
        uploadedBy: {
          name: file.uploadedBy.name,
          avatarUrl: file.uploadedBy.avatarUrl,
        },
      },
      downloadUrl,
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/files/[fileId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[workspaceId]/files/[fileId]
// Delete file from object storage and database
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; fileId: string }> }
) {
  const { workspaceId, fileId } = await params

  try {
    // 1. Verify user has ADMIN or OWNER permission in the workspace
    const { user } = await requireWorkspaceAccess(workspaceId, 'ADMIN')

    // 2. Fetch the file details first to retrieve the storageKey
    const file = await prisma.file.findUnique({
      where: {
        id: fileId,
        workspaceId,
      },
      select: {
        name: true,
        storageKey: true,
      },
    })

    if (!file) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    // 3. Delete the file object from Supabase bucket
    await deleteFile(file.storageKey)

    // 4. Delete the database record & write to audit logs in a transaction
    // Note: related Chunks cascade delete via database schema keys
    await prisma.$transaction(async (tx) => {
      await tx.file.delete({
        where: {
          id: fileId,
        },
      })

      // Log the deletion audit
      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: user.id,
          action: 'file.delete',
          metadata: {
            fileId,
            fileName: file.name,
          },
        },
      })
    })

    // 5. Invalidate the file list cache for this workspace
    await invalidateWorkspaceFilesCache(workspaceId)

    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('DELETE /api/workspaces/[workspaceId]/files/[fileId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
