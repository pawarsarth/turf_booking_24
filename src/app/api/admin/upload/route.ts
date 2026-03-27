import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const { image, folder = 'turfs' } = await req.json();
  if (!image) return NextResponse.json({ success: false, error: 'image required' }, { status: 400 });

  try {
    const url = await uploadImage(image, folder);
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
