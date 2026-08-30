import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { verifyAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import { isAdminAuthorized } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Check authentication
    const session = await verifyAdminSessionCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE.name)?.value);

    if (!session || !isAdminAuthorized(session.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get filename from params
    const filename = params.filename;
    const filePath = path.join(process.cwd(), 'public', 'admin-assets', filename);

    // Security: prevent directory traversal
    if (!filePath.includes('admin-assets') || !existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
