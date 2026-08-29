import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    mode: 'commercial_multi_tenant',
    environment: process.env.NODE_ENV || 'development',
  });
}
