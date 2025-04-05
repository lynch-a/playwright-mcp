import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ToolFactory } from './tool';

// Schemas for record_start and record_stop (currently no input parameters)
const recordStartSchema = z.object({});
const recordStopSchema = z.object({});

const recordStart: ToolFactory = captureSnapshot => ({
  capability: 'record',
  schema: {
    name: 'record_start',
    description: 'Start recording network requests and responses by attaching event listeners to the page.',
    inputSchema: zodToJsonSchema(recordStartSchema),
  },
  handle: async context => {
    const currentTab = await context.ensureTab();
    return await currentTab.runAndWait(async tab => {
      // Initialize the storage for captured events
      tab.recordedEvents = [];

      // Define event listener for requests
      const onRequest = (req: any) => {
        const requestData = {
          type: 'request',
          url: req.url(),
          method: req.method(),
          // postData might be null if not applicable
          postData: req.postData ? req.postData() : null,
        };
        tab.recordedEvents.push(requestData);
      };

      // Define event listener for responses
      const onResponse = (res: any) => {
        const responseData = {
          type: 'response',
          url: res.url(),
          status: res.status(),
        };
        tab.recordedEvents.push(responseData);
      };

      // Attach the event listeners and store their references for later removal
      tab.page.on('request', onRequest);
      tab.page.on('response', onResponse);
      tab.recordingListeners = { onRequest, onResponse };
    }, {
      status: 'Started recording network events',
      captureSnapshot,
    });
  },
});

const recordStop: ToolFactory = captureSnapshot => ({
  capability: 'record',
  schema: {
    name: 'record_stop',
    description: 'Stop recording network events by detaching event listeners and return the captured events.',
    inputSchema: zodToJsonSchema(recordStopSchema),
  },
  handle: async context => {
    const tab = await context.ensureTab();
    
    // Remove event listeners if they exist.
    if (tab.recordingListeners) {
      tab.page.removeListener('request', tab.recordingListeners.onRequest);
      tab.page.removeListener('response', tab.recordingListeners.onResponse);
      delete tab.recordingListeners;
    }
    
    // Retrieve the recorded events and then clear them.
    const events = tab.recordedEvents || [];
    tab.recordedEvents = [];
    
    return {
      content: [{
        type: 'text',
        text: events.map(event => JSON.stringify(event)).join(","),
      }],
    };
  },
});

export default (captureSnapshot: boolean) => [
  recordStart(captureSnapshot),
  recordStop(captureSnapshot),
];