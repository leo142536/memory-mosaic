import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/store';
import { seedDemoAgents } from '@/lib/orchestrator';

export async function GET() {
    const agents = getAllAgents();
    if (agents.length === 0) {
        seedDemoAgents();
    }
    return NextResponse.json({ agents: getAllAgents() });
}
