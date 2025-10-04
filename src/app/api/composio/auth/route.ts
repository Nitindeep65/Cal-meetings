import { NextRequest, NextResponse } from 'next/server';
import { Composio } from '@composio/core';

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const authConfigId = process.env.COMPOSIO_AUTH_CONFIG_ID;
    
    if (!authConfigId) {
      return NextResponse.json(
        { error: 'Composio auth config not configured' },
        { status: 500 }
      );
    }

    // Initiate Google Calendar connection
    const connectionRequest = await composio.connectedAccounts.initiate(
      userId,
      authConfigId
    );

    return NextResponse.json({
      success: true,
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
      status: connectionRequest.status,
    });

  } catch (error) {
    console.error('Error initiating Composio auth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Check connection status
    const connectedAccount = await composio.connectedAccounts.get(connectionId);
    
    return NextResponse.json({
      success: true,
      connection: connectedAccount,
    });

  } catch (error) {
    console.error('Error checking connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}