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
    // listUsers returns data in pages; fetch everything so Firestore users never show "No Email" just
    // because they are outside the first 1000 results.
    const emailByUid: Record<string, string> = {};
    let pageToken: string | undefined = undefined;

    while (true) {
      const result = await adminAuth.listUsers(1000, pageToken);
      for (const user of result.users) {
        const email = user.email || "No Email";
        emailByUid[user.uid] = email;
      }

      pageToken = result.pageToken;
      if (!pageToken) break;
    }

    console.log(`API: Successfully mapped ${Object.keys(emailByUid).length} emails.`);
    return NextResponse.json(emailByUid);
  } catch (error) {
    console.error('Error fetching Auth emails for admin:', error);
    return NextResponse.json({ error: 'Failed to fetch auth emails' }, { status: 500 });
  }
}
