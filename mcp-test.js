import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testMCPServer() {
  try {
    console.log('🔧 Testing MCP Composio server...');
    
    // Create transport
    const transport = new SSEClientTransport(
      new URL('https://apollo.composio.dev/v3/mcp/96addd2f-4995-4dae-b38d-1857212ec1d8/sse')
    );

    // Create client
    const client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Connect
    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log('🛠️ Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
    });

    // List available resources
    const resources = await client.listResources();
    console.log('📦 Available resources:');
    resources.resources.forEach(resource => {
      console.log(`  - ${resource.uri}: ${resource.name || 'No name'}`);
    });

    await client.close();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMCPServer();