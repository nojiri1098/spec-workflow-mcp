import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { specStatusTool, specStatusHandler } from './spec-status.js';
import { approvalsTool, approvalsHandler } from './approvals.js';
import { createTestAspectsTool, createTestAspectsHandler } from './create-test-aspects.js';
import { qaWorkflowGuideTool, qaWorkflowGuideHandler } from './qa-workflow-guide.js';
import { ToolContext, ToolResponse, MCPToolResponse, toMCPResponse } from '../types.js';

export function registerTools(): Tool[] {
  return [
    specStatusTool,
    approvalsTool,
    createTestAspectsTool,
    qaWorkflowGuideTool
  ];
}

export async function handleToolCall(name: string, args: any, context: ToolContext): Promise<MCPToolResponse> {
  let response: ToolResponse;
  let isError = false;

  try {
    switch (name) {
      case 'spec-status':
        response = await specStatusHandler(args, context);
        break;
      case 'approvals':
        response = await approvalsHandler(args, context);
        break;
      case 'create_test_aspects':
        response = await createTestAspectsHandler(args, context);
        break;
      case 'qa-workflow-guide':
        response = await qaWorkflowGuideHandler(args, context);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Check if the response indicates an error
    isError = !response.success;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    response = {
      success: false,
      message: `Tool execution failed: ${errorMessage}`
    };
    isError = true;
  }

  return toMCPResponse(response, isError);
}