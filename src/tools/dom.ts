import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool } from './tool';

const browserHtmlSchema = z.object({});

const browser_html: Tool = {
  capability: 'html',
  schema: {
    name: 'browser_html',
    description: 'Retrieve the HTML content of the current page',
    inputSchema: zodToJsonSchema(browserHtmlSchema),
  },
  handle: async context => {
    const tab = context.currentTab();
    const htmlContent = await tab.page.content();
    return {
      content: [{
        type: 'text',
        text: htmlContent,
      }],
    };
  },
};

export default [browser_html];