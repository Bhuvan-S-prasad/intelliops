import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Clerk webhook event types we handle
type ClerkUserEventData = {
  id: string
  email_addresses: Array<{
    id: string
    email_address: string
  }>
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
}

type ClerkWebhookEvent = {
  type: string
  data: ClerkUserEventData
}

function getEmail(data: ClerkUserEventData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
}

function getFullName(data: ClerkUserEventData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return new Response('Server misconfigured', { status: 500 })
  }

  // Get Svix headers for signature verification
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Read the raw body
  const payload = await req.text()

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the event
  const { type, data } = event

  if (type === 'user.created') {
    const email = getEmail(data)
    const name = getFullName(data)

    await prisma.user.create({
      data: {
        clerkId: data.id,
        email,
        name,
        avatarUrl: data.image_url,
      },
    })

    console.log(`User created: ${data.id} (${email})`)
  }

  if (type === 'user.updated') {
    const email = getEmail(data)
    const name = getFullName(data)

    await prisma.user.update({
      where: { clerkId: data.id },
      data: {
        email,
        name,
        avatarUrl: data.image_url,
      },
    })

    console.log(`User updated: ${data.id} (${email})`)
  }

  return new Response('OK', { status: 200 })
}
