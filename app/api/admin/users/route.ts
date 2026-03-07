import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log("API: Fetching emails from Firebase Auth...");
  try {
    // Fetch all users from Firebase Auth (emails)
    if (!adminAuth) {
      console.error("Firebase adminAuth is not initialized.");
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }
    const listUsersResult = await adminAuth.listUsers(1000);
    const authUsers = listUsersResult.users.reduce((acc: any, user: any) => {
      acc[user.uid] = user.email || 'No Email';
      return acc;
    }, {});

    console.log(`API: Successfully mapped ${Object.keys(authUsers).length} emails.`);
    return NextResponse.json(authUsers);
  } catch (error) {
    console.error('Error fetching Auth emails for admin:', error);
    return NextResponse.json({ error: 'Failed to fetch auth emails' }, { status: 500 });
  }
}
