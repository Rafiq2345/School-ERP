import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const assetType = (formData.get('type') as string) || 'general'; // logo, signature, stamp, doc

      if (!file) {
        return NextResponse.json({ success: false, error: { message: 'No file provided' } }, { status: 400 });
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: { message: 'File size exceeds 5MB limit' } }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create storage directory in public folder
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'organization', assetType);
      fs.mkdirSync(targetDir, { recursive: true });

      const ext = path.extname(file.name) || '.png';
      const cleanName = `${auth.tenantId}_${assetType}_${Date.now()}${ext}`;
      const filePath = path.join(targetDir, cleanName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/organization/${assetType}/${cleanName}`;

      return NextResponse.json({
        success: true,
        data: {
          url: publicUrl,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
        },
      });
    }

    // Handle Base64 JSON payload
    const body = await req.json();
    if (body.dataUrl) {
      const assetType = body.type || 'general';
      const matches = body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ success: false, error: { message: 'Invalid data URI format' } }, { status: 400 });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'organization', assetType);
      fs.mkdirSync(targetDir, { recursive: true });

      const ext = matches[1].includes('png') ? '.png' : matches[1].includes('svg') ? '.svg' : '.jpg';
      const cleanName = `${auth.tenantId}_${assetType}_${Date.now()}${ext}`;
      const filePath = path.join(targetDir, cleanName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/organization/${assetType}/${cleanName}`;

      return NextResponse.json({
        success: true,
        data: {
          url: publicUrl,
          size: buffer.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: { message: 'Unsupported upload format' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'File upload failed' } }, { status: 500 });
  }
}
