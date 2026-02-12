import { NextRequest, NextResponse } from 'next/server';
import { getStory } from '@/lib/store';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const story = getStory(id);
    if (!story) {
        return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }
    return NextResponse.json({ story });
}
