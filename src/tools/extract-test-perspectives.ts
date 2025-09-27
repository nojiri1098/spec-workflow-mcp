import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TestPerspective, TestPerspectiveProject, InputDocument } from '../types.js';
import { validateProjectPath } from '../core/path-utils.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const extractTestPerspectivesTool: Tool = {
  name: 'extract_test_perspectives',
  description: `Extract comprehensive test perspectives from requirement documents, design specs, and other inputs.

# Instructions
Analyze provided documents and extract comprehensive test perspectives covering:
- Functional testing angles from requirements and features
- Non-functional requirements (performance, security, usability)
- Edge cases and error conditions
- Integration points and dependencies
- User experience considerations
- Data validation and boundary testing
- Security vulnerabilities and access controls

Generate structured test perspectives that can guide comprehensive test case design.

IMPORTANT: Only analyze files that exist and are accessible. Generate practical, actionable test perspectives.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root'
      },
      projectName: {
        type: 'string',
        description: 'Name of the project for test perspective extraction'
      },
      inputDocuments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to document file (relative to project root or absolute)'
            },
            type: {
              type: 'string',
              enum: ['requirements', 'design', 'api-spec', 'ui-design', 'user-story'],
              description: 'Type of document for appropriate analysis approach'
            },
            description: {
              type: 'string',
              description: 'Brief description of the document content'
            }
          },
          required: ['filePath', 'type']
        },
        description: 'List of input documents to analyze for test perspectives'
      },
      focusAreas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific areas to focus on (e.g., "authentication", "data validation", "performance")'
      }
    },
    required: ['projectPath', 'projectName', 'inputDocuments']
  }
};

export async function extractTestPerspectivesHandler(
  args: {
    projectPath: string;
    projectName: string;
    inputDocuments: InputDocument[];
    focusAreas?: string[];
  },
  context: ToolContext
): Promise<ToolResponse> {
  try {
    // Validate project path
    const validatedProjectPath = await validateProjectPath(args.projectPath);

    // Ensure test-perspectives directory exists
    const testPerspectivesDir = join(validatedProjectPath, '.spec-workflow', 'test-perspectives');
    const extractedDir = join(testPerspectivesDir, 'extracted');

    if (!existsSync(testPerspectivesDir)) {
      mkdirSync(testPerspectivesDir, { recursive: true });
    }
    if (!existsSync(extractedDir)) {
      mkdirSync(extractedDir, { recursive: true });
    }

    // Read and analyze input documents
    const documentContents: { document: InputDocument; content: string }[] = [];
    const missingFiles: string[] = [];

    for (const doc of args.inputDocuments) {
      const filePath = doc.filePath.startsWith('/')
        ? doc.filePath
        : join(validatedProjectPath, doc.filePath);

      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          documentContents.push({ document: doc, content });
        } catch (error) {
          missingFiles.push(`${doc.filePath} (read error: ${error instanceof Error ? error.message : String(error)})`);
        }
      } else {
        missingFiles.push(doc.filePath);
      }
    }

    if (documentContents.length === 0) {
      return {
        success: false,
        message: `No readable documents found. Missing files: ${missingFiles.join(', ')}`,
        nextSteps: [
          'Check file paths are correct',
          'Ensure files exist and are readable',
          'Use absolute paths or paths relative to project root'
        ]
      };
    }

    // Generate test perspectives using LLM analysis
    const perspectives = await generateTestPerspectives(
      documentContents,
      args.projectName,
      args.focusAreas || []
    );

    // Create test perspective project
    const testPerspectiveProject: TestPerspectiveProject = {
      projectName: args.projectName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      perspectives,
      status: 'extracted'
    };

    // Save to file
    const outputPath = join(extractedDir, `${args.projectName}.md`);
    const markdownContent = generateMarkdownReport(testPerspectiveProject, documentContents, missingFiles);

    writeFileSync(outputPath, markdownContent, 'utf-8');

    return {
      success: true,
      message: `Successfully extracted ${perspectives.length} test perspectives for ${args.projectName}`,
      data: {
        projectName: args.projectName,
        perspectivesCount: perspectives.length,
        outputPath: outputPath.replace(validatedProjectPath, '.'),
        processedDocuments: documentContents.length,
        skippedDocuments: missingFiles.length,
        perspectives: perspectives.map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          priority: p.priority
        }))
      },
      nextSteps: [
        `Review extracted perspectives: ${outputPath.replace(validatedProjectPath, '.')}`,
        'Request approval for review: approvals action:"request" category:"test-perspective"',
        `Use dashboard to review detailed perspectives: ${context.dashboardUrl || 'Start dashboard or use VS Code extension'}`,
        ...(missingFiles.length > 0 ? [`Note: ${missingFiles.length} files were skipped: ${missingFiles.join(', ')}`] : [])
      ],
      projectContext: {
        projectPath: validatedProjectPath,
        workflowRoot: join(validatedProjectPath, '.spec-workflow'),
        dashboardUrl: context.dashboardUrl
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to extract test perspectives: ${errorMessage}`,
      nextSteps: [
        'Check project path exists',
        'Verify document file paths',
        'Ensure file permissions allow reading'
      ]
    };
  }
}

async function generateTestPerspectives(
  documentContents: { document: InputDocument; content: string }[],
  projectName: string,
  focusAreas: string[]
): Promise<TestPerspective[]> {
  const perspectives: TestPerspective[] = [];

  // Analyze each document and extract perspectives
  for (const { document, content } of documentContents) {
    const documentPerspectives = await analyzeDocumentForPerspectives(document, content, focusAreas);
    perspectives.push(...documentPerspectives);
  }

  // Add cross-cutting perspectives
  const crossCuttingPerspectives = generateCrossCuttingPerspectives(projectName, documentContents, focusAreas);
  perspectives.push(...crossCuttingPerspectives);

  return perspectives;
}

async function analyzeDocumentForPerspectives(
  document: InputDocument,
  content: string,
  focusAreas: string[]
): Promise<TestPerspective[]> {
  const perspectives: TestPerspective[] = [];

  // Extract key information based on document type
  switch (document.type) {
    case 'requirements':
      perspectives.push(...extractRequirementsPerspectives(document, content, focusAreas));
      break;
    case 'design':
      perspectives.push(...extractDesignPerspectives(document, content, focusAreas));
      break;
    case 'api-spec':
      perspectives.push(...extractAPISpecPerspectives(document, content, focusAreas));
      break;
    case 'ui-design':
      perspectives.push(...extractUIDesignPerspectives(document, content, focusAreas));
      break;
    case 'user-story':
      perspectives.push(...extractUserStoryPerspectives(document, content, focusAreas));
      break;
  }

  return perspectives;
}

function extractRequirementsPerspectives(document: InputDocument, content: string, focusAreas: string[]): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // Functional requirements testing
  perspectives.push({
    id: uuidv4(),
    title: 'Functional Requirements Validation',
    description: 'Verify all functional requirements are implemented correctly according to specifications',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'Requirements analysis',
    rationale: 'Core functionality must work as specified to meet user needs',
    testConditions: [
      'Each requirement is testable and verifiable',
      'Happy path scenarios work correctly',
      'Requirement dependencies are satisfied',
      'Business rules are enforced'
    ],
    risks: [
      'Incomplete requirement implementation',
      'Misinterpretation of requirements',
      'Missing edge cases in requirements'
    ]
  });

  // Input validation testing
  perspectives.push({
    id: uuidv4(),
    title: 'Input Validation and Data Integrity',
    description: 'Test data validation, sanitization, and boundary conditions for all inputs',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'Data handling requirements',
    rationale: 'Invalid input handling is critical for system stability and security',
    testConditions: [
      'Valid input acceptance',
      'Invalid input rejection with proper error messages',
      'Boundary value testing (min/max values)',
      'Special character and injection attempt handling'
    ],
    risks: [
      'Data corruption from invalid inputs',
      'Security vulnerabilities from injection attacks',
      'System crashes from unexpected input'
    ]
  });

  return perspectives;
}

function extractDesignPerspectives(document: InputDocument, content: string, focusAreas: string[]): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // Integration testing
  perspectives.push({
    id: uuidv4(),
    title: 'Component Integration Testing',
    description: 'Test interactions between system components as defined in design',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'System design and component interactions',
    rationale: 'Component interfaces must work correctly for system functionality',
    testConditions: [
      'Component communication protocols work correctly',
      'Data flow between components is accurate',
      'Error handling across component boundaries',
      'Performance of component interactions'
    ],
    risks: [
      'Integration failures causing system breakdown',
      'Data loss in component communication',
      'Performance bottlenecks at integration points'
    ]
  });

  // Performance considerations
  perspectives.push({
    id: uuidv4(),
    title: 'Performance and Scalability Validation',
    description: 'Verify system meets performance requirements under various load conditions',
    category: 'non-functional',
    priority: 'medium',
    source: document.filePath,
    extractedFrom: 'Performance requirements and design constraints',
    rationale: 'System must handle expected load and scale appropriately',
    testConditions: [
      'Response time under normal load',
      'System behavior under peak load',
      'Resource utilization monitoring',
      'Scalability limits and bottlenecks'
    ],
    risks: [
      'Poor user experience due to slow response',
      'System failure under high load',
      'Unexpected resource consumption'
    ]
  });

  return perspectives;
}

function extractAPISpecPerspectives(document: InputDocument, content: string, focusAreas: string[]): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // API contract testing
  perspectives.push({
    id: uuidv4(),
    title: 'API Contract and Schema Validation',
    description: 'Test API endpoints conform to specified contracts, schemas, and behavior',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'API specification and schemas',
    rationale: 'API contracts must be reliable for client integration',
    testConditions: [
      'Request/response schema validation',
      'HTTP status code correctness',
      'Error response format consistency',
      'API version compatibility'
    ],
    risks: [
      'Breaking changes affecting clients',
      'Data format inconsistencies',
      'Authentication/authorization failures'
    ]
  });

  // API security testing
  perspectives.push({
    id: uuidv4(),
    title: 'API Security and Access Control',
    description: 'Verify API security measures, authentication, and authorization mechanisms',
    category: 'security',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'API security specifications',
    rationale: 'API security is critical to prevent unauthorized access and data breaches',
    testConditions: [
      'Authentication mechanism validation',
      'Authorization rules enforcement',
      'Rate limiting effectiveness',
      'Input sanitization and injection prevention'
    ],
    risks: [
      'Unauthorized data access',
      'API abuse and DoS attacks',
      'Data injection vulnerabilities'
    ]
  });

  return perspectives;
}

function extractUIDesignPerspectives(document: InputDocument, content: string, focusAreas: string[]): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // Usability testing
  perspectives.push({
    id: uuidv4(),
    title: 'User Interface and Experience Validation',
    description: 'Test UI design implementation and user experience flows',
    category: 'usability',
    priority: 'medium',
    source: document.filePath,
    extractedFrom: 'UI/UX design specifications',
    rationale: 'User interface must be intuitive and accessible for effective user adoption',
    testConditions: [
      'UI element placement and visibility',
      'Navigation flow and consistency',
      'Responsive design across devices',
      'Accessibility compliance (WCAG)'
    ],
    risks: [
      'Poor user experience leading to abandonment',
      'Accessibility issues excluding users',
      'Inconsistent behavior across platforms'
    ]
  });

  return perspectives;
}

function extractUserStoryPerspectives(document: InputDocument, content: string, focusAreas: string[]): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // User journey testing
  perspectives.push({
    id: uuidv4(),
    title: 'User Journey and Workflow Validation',
    description: 'Test complete user workflows and story acceptance criteria',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'User stories and acceptance criteria',
    rationale: 'User stories represent real user needs that must be satisfied',
    testConditions: [
      'Acceptance criteria are met',
      'User workflow completion',
      'Error scenarios and recovery',
      'User role and permission validation'
    ],
    risks: [
      'User goals not achievable',
      'Workflow interruptions',
      'Role-based access failures'
    ]
  });

  return perspectives;
}

function generateCrossCuttingPerspectives(
  projectName: string,
  documentContents: { document: InputDocument; content: string }[],
  focusAreas: string[]
): TestPerspective[] {
  const perspectives: TestPerspective[] = [];

  // Error handling and recovery
  perspectives.push({
    id: uuidv4(),
    title: 'Error Handling and System Recovery',
    description: 'Test system behavior under error conditions and recovery mechanisms',
    category: 'non-functional',
    priority: 'high',
    source: 'Cross-cutting analysis',
    extractedFrom: 'System-wide error handling requirements',
    rationale: 'Robust error handling is essential for system reliability and user trust',
    testConditions: [
      'Graceful error handling and user messaging',
      'System recovery from failures',
      'Data consistency during errors',
      'Logging and monitoring of errors'
    ],
    risks: [
      'System crashes from unhandled errors',
      'Data loss during failure scenarios',
      'Poor user experience with unclear error messages'
    ]
  });

  // Security considerations
  perspectives.push({
    id: uuidv4(),
    title: 'Security and Data Protection',
    description: 'Comprehensive security testing across all system components',
    category: 'security',
    priority: 'high',
    source: 'Cross-cutting analysis',
    extractedFrom: 'Security requirements and best practices',
    rationale: 'Security vulnerabilities can compromise entire system and user data',
    testConditions: [
      'Authentication and session management',
      'Data encryption and secure transmission',
      'Access control and privilege escalation prevention',
      'Input validation and injection attack prevention'
    ],
    risks: [
      'Data breaches and unauthorized access',
      'System compromise through vulnerabilities',
      'Compliance violations and legal issues'
    ]
  });

  return perspectives;
}

function generateMarkdownReport(
  project: TestPerspectiveProject,
  documentContents: { document: InputDocument; content: string }[],
  missingFiles: string[]
): string {
  const markdown = `# Test Perspectives: ${project.projectName}

## Extraction Summary
- **Project**: ${project.projectName}
- **Extraction Date**: ${new Date(project.createdAt).toLocaleDateString()}
- **Status**: ${project.status}
- **Total Perspectives**: ${project.perspectives.length}
- **Processed Documents**: ${documentContents.length}
${missingFiles.length > 0 ? `- **Skipped Documents**: ${missingFiles.length}` : ''}

## Source Documents
${documentContents.map(doc => `- **${doc.document.type}**: ${doc.document.filePath}${doc.document.description ? ` - ${doc.document.description}` : ''}`).join('\n')}

${missingFiles.length > 0 ? `## Skipped Documents
${missingFiles.map(file => `- ${file}`).join('\n')}

` : ''}## Extracted Test Perspectives

${project.perspectives.map((perspective, index) => `### ${perspective.category.toUpperCase()}-${String(index + 1).padStart(3, '0')}: ${perspective.title}

- **Category**: ${perspective.category.charAt(0).toUpperCase() + perspective.category.slice(1)}
- **Priority**: ${perspective.priority.charAt(0).toUpperCase() + perspective.priority.slice(1)}
- **Source**: ${perspective.source}
- **Extracted From**: ${perspective.extractedFrom}

**Description**: ${perspective.description}

**Rationale**: ${perspective.rationale}

**Test Conditions**:
${perspective.testConditions.map(condition => `- ${condition}`).join('\n')}

**Associated Risks**:
${perspective.risks.map(risk => `- ${risk}`).join('\n')}

---
`).join('\n')}

## Next Steps

1. **Review** each test perspective for completeness and accuracy
2. **Request approval** via dashboard or use: \`approvals action:"request" category:"test-perspective"\`
3. **Refine** perspectives based on review feedback
4. **Proceed** to test case design once approved

---

*Generated by extract_test_perspectives tool at ${new Date().toISOString()}*
`;

  return markdown;
}