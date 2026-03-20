import { auth } from '@clerk/nextjs/server';
import { db } from './db';
import { headers } from 'next/headers';

const FREE_TRIES_LIMIT = 2;

/**
 * Get a unique identifier for anonymous users (IP address)
 */
async function getAnonymousId(): Promise<string | null> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip');
  return ip || null;
}

/**
 * Check if user has exceeded free tries
 * Returns: { allowed: boolean, remaining: number, requiresAuth: boolean }
 */
export async function checkGateStatus(): Promise<{
  allowed: boolean;
  remaining: number;
  requiresAuth: boolean;
  isAuthenticated: boolean;
}> {
  const { userId: clerkId } = await auth();
  
  // If user is authenticated, check their subscription status
  if (clerkId) {
    // Look up user in database by clerkId
    let user;
    try {
      user = await db.user.findUnique({
        where: { clerkId },
      });
    } catch (error) {
      console.error('Database error in checkGateStatus (user lookup):', error);
      // If database fails, allow the request but log the error
      return {
        allowed: true,
        remaining: Infinity,
        requiresAuth: false,
        isAuthenticated: true,
      };
    }
    
    // TODO: Check subscription status from Stripe
    // For now, authenticated users have unlimited access
    // You'll need to implement subscription checking here
    return {
      allowed: true,
      remaining: Infinity,
      requiresAuth: false,
      isAuthenticated: true,
    };
  }

  // For anonymous users, check their analysis count
  const anonymousId = await getAnonymousId();
  if (!anonymousId) {
    // Can't track anonymous user, deny access
    return {
      allowed: false,
      remaining: 0,
      requiresAuth: true,
      isAuthenticated: false,
    };
  }

  // Count analyses for this anonymous user (by IP)
  let analysisCount = 0;
  try {
    analysisCount = await db.analysis.count({
      where: {
        anonymousId: anonymousId,
        userId: null, // Only count anonymous analyses
      },
    });
  } catch (error) {
    console.error('Database error in checkGateStatus:', error);
    // If database fails, allow the request but log the error
    // This prevents blocking users if DB is temporarily unavailable
    return {
      allowed: true,
      remaining: FREE_TRIES_LIMIT,
      requiresAuth: false,
      isAuthenticated: false,
    };
  }

  const remaining = Math.max(0, FREE_TRIES_LIMIT - analysisCount);
  const allowed = remaining > 0;

  return {
    allowed,
    remaining,
    requiresAuth: !allowed,
    isAuthenticated: false,
  };
}

/**
 * Record an analysis attempt with report data
 * Returns the created analysis record
 */
export async function recordAnalysis(
  clerkId: string | null,
  anonymousId: string | null,
  reportData?: unknown
) {
  try {
    let userId: number | null = null;
    
    // If user is authenticated, look up or create user record
    if (clerkId) {
      let user = await db.user.findUnique({
        where: { clerkId },
      });
      
      // Create user if doesn't exist
      if (!user) {
        // Get user info from Clerk (you might want to pass this in)
        user = await db.user.create({
          data: {
            clerkId,
            email: '', // Will be updated when we have user info
            name: null,
          },
        });
      }
      
      userId = user.id;
    }
    
    const analysis = await db.analysis.create({
      data: {
        userId: userId,
        clerkId: clerkId,
        anonymousId: anonymousId,
        reportData: reportData ? (reportData as object) : null,
        createdAt: new Date(),
      },
    });
    
    console.log('Analysis record created with ID:', analysis.id);
    console.log('Analysis has reportData:', !!analysis.reportData);
    
    return analysis;
  } catch (error) {
    console.error('Database error in recordAnalysis:', error);
    throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
}

