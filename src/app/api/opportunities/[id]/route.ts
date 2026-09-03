import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedCatalog } from '@/domain/schemes';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const catalog = getVerifiedCatalog();
    const opportunity = catalog.find((c) => c.id === params.id);

    if (!opportunity) {
      return NextResponse.json(
        { error: `Opportunity with id '${params.id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ opportunity });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch opportunity', message: err?.message },
      { status: 500 }
    );
  }
}
