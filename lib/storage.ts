import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketName = process.env.SUPABASE_BUCKET_NAME

if (!supabaseUrl || !supabaseServiceKey || !bucketName) {
  console.warn('Supabase storage environment variables are missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET_NAME).')
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseServiceKey || 'placeholder-key'
)

export async function uploadFile(key: string, body: Buffer, contentType: string) {
  if (!bucketName) throw new Error('SUPABASE_BUCKET_NAME is not configured')
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some(b => b.name === bucketName)
    if (!exists) {
      console.log(`Bucket "${bucketName}" not found. Attempting to create it...`)
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800 // 50MB
      })
      if (createError) {
        console.warn(`Failed to create bucket "${bucketName}":`, createError.message)
      } else {
        console.log(`Successfully created bucket "${bucketName}".`)
      }
    }
  } catch (err) {
    console.warn('Error listing or creating buckets:', err)
  }
  
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(key, body, { contentType, upsert: false })
  if (error) throw error
  return key
}

export async function deleteFile(key: string) {
  if (!bucketName) throw new Error('SUPABASE_BUCKET_NAME is not configured')

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([key])
  if (error) throw error
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  if (!bucketName) throw new Error('SUPABASE_BUCKET_NAME is not configured')

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(key, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function downloadFile(key: string): Promise<Buffer> {
  if (!bucketName) throw new Error('SUPABASE_BUCKET_NAME is not configured')

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(key)
  if (error) throw error
  
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
