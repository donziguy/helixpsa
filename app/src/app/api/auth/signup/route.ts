import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationDomain: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, firstName, lastName, organizationName, organizationDomain } = 
      signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Check if organization domain is already taken
    if (organizationDomain) {
      const existingOrg = await db.query.organizations.findFirst({
        where: eq(organizations.domain, organizationDomain),
      })

      if (existingOrg) {
        return NextResponse.json(
          { error: 'Organization domain already taken' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create organization first
    const [newOrganization] = await db.insert(organizations).values({
      name: organizationName,
      domain: organizationDomain || null,
    }).returning()

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: newOrganization.id,
      role: 'admin', // First user is always admin
    }).returning()

    // Return success (don't include password in response)
    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationId: newUser.organizationId,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}