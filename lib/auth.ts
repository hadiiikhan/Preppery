import { auth, currentUser } from '@clerk/nextjs/server';

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;
  
  const user = await currentUser();
  return user;
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

