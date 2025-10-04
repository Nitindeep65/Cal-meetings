const { Composio } = require('@composio/core');

async function checkTools() {
  try {
    const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
    
    console.log('Fetching all tools...');
    const allTools = await composio.tools.list();
    
    console.log('\n=== Google Calendar related tools ===');
    const calendarTools = allTools.filter(tool => 
      tool.name.toLowerCase().includes('google') && 
      tool.name.toLowerCase().includes('calendar')
    );
    
    if (calendarTools.length === 0) {
      console.log('No Google Calendar tools found');
      console.log('\n=== All available tools (first 20) ===');
      allTools.slice(0, 20).forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description || 'No description'}`);
      });
    } else {
      calendarTools.forEach(tool => {
        console.log(`\nTool: ${tool.name}`);
        console.log(`Description: ${tool.description || 'No description'}`);
        console.log(`Tags: ${tool.tags ? tool.tags.join(', ') : 'None'}`);
        if (tool.parameters) {
          console.log('Parameters:');
          console.log(JSON.stringify(tool.parameters, null, 2));
        }
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTools();
