import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TestAspect, TestAspectProject, InputDocument } from '../types.js';
import { validateProjectPath } from '../core/path-utils.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const extractTestAspectsTool: Tool = {
  name: 'extract_test_aspects',
  description: `Extract comprehensive test aspects from requirement documents, design specs, and other inputs.

# Instructions
Analyze provided documents and extract comprehensive test aspects covering:
- Functional testing angles from requirements and features
- Non-functional requirements (performance, security, usability)
- Edge cases and error conditions
- Integration points and dependencies
- User experience considerations
- Data validation and boundary testing
- Security vulnerabilities and access controls

Generate structured test aspects that can guide comprehensive test case design.

IMPORTANT: Only analyze files that exist and are accessible. Generate practical, actionable test aspects.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project root'
      },
      projectName: {
        type: 'string',
        description: 'Name of the project for test aspect extraction'
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
        description: 'List of input documents to analyze for test aspects'
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

export async function extractTestAspectsHandler(
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

    // Ensure test-aspects directory exists
    const testAspectsDir = join(validatedProjectPath, '.spec-workflow', 'test-aspects');
    const extractedDir = join(testAspectsDir, 'extracted');

    if (!existsSync(testAspectsDir)) {
      mkdirSync(testAspectsDir, { recursive: true });
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

    // Generate test aspects using LLM analysis
    const aspects = await generateTestAspects(
      documentContents,
      args.projectName,
      args.focusAreas || []
    );

    // Create test aspect project
    const testAspectProject: TestAspectProject = {
      projectName: args.projectName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      aspects,
      status: 'extracted'
    };

    // Save to file
    const outputPath = join(extractedDir, `${args.projectName}.md`);
    const markdownContent = generateMarkdownReport(testAspectProject, documentContents, missingFiles);

    writeFileSync(outputPath, markdownContent, 'utf-8');

    return {
      success: true,
      message: `Successfully extracted ${aspects.length} test aspects for ${args.projectName}`,
      data: {
        projectName: args.projectName,
        aspectsCount: aspects.length,
        outputPath: outputPath.replace(validatedProjectPath, '.'),
        processedDocuments: documentContents.length,
        skippedDocuments: missingFiles.length,
        aspects: aspects.map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          priority: p.priority
        }))
      },
      nextSteps: [
        `Review extracted aspects: ${outputPath.replace(validatedProjectPath, '.')}`,
        'Request approval for review: approvals action:"request" category:"test-aspect"',
        `Use dashboard to review detailed aspects: ${context.dashboardUrl || 'Start dashboard or use VS Code extension'}`,
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
      message: `Failed to extract test aspects: ${errorMessage}`,
      nextSteps: [
        'Check project path exists',
        'Verify document file paths',
        'Ensure file permissions allow reading'
      ]
    };
  }
}

async function generateTestAspects(
  documentContents: { document: InputDocument; content: string }[],
  projectName: string,
  focusAreas: string[]
): Promise<TestAspect[]> {
  const aspects: TestAspect[] = [];

  // Analyze each document and extract aspects
  for (const { document, content } of documentContents) {
    const documentAspects = await analyzeDocumentForAspects(document, content, focusAreas);
    aspects.push(...documentAspects);
  }

  // Add cross-cutting aspects
  const crossCuttingAspects = generateCrossCuttingAspects(projectName, documentContents, focusAreas);
  aspects.push(...crossCuttingAspects);

  return aspects;
}

async function analyzeDocumentForAspects(
  document: InputDocument,
  content: string,
  focusAreas: string[]
): Promise<TestAspect[]> {
  const aspects: TestAspect[] = [];

  // Extract key information based on document type
  switch (document.type) {
    case 'requirements':
      aspects.push(...extractRequirementsAspects(document, content, focusAreas));
      break;
    case 'design':
      aspects.push(...extractDesignAspects(document, content, focusAreas));
      break;
    case 'api-spec':
      aspects.push(...extractAPISpecAspects(document, content, focusAreas));
      break;
    case 'ui-design':
      aspects.push(...extractUIDesignAspects(document, content, focusAreas));
      break;
    case 'user-story':
      aspects.push(...extractUserStoryAspects(document, content, focusAreas));
      break;
  }

  return aspects;
}

function extractRequirementsAspects(document: InputDocument, content: string, focusAreas: string[]): TestAspect[] {
  const aspects: TestAspect[] = [];

  // Functional requirements testing
  aspects.push({
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
  aspects.push({
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

  return aspects;
}

function extractDesignAspects(document: InputDocument, content: string, focusAreas: string[]): TestAspect[] {
  const aspects: TestAspect[] = [];

  // Integration testing
  aspects.push({
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
  aspects.push({
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

  return aspects;
}

function extractAPISpecAspects(document: InputDocument, content: string, focusAreas: string[]): TestAspect[] {
  const aspects: TestAspect[] = [];

  // API contract testing
  aspects.push({
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
  aspects.push({
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

  return aspects;
}

function extractUIDesignAspects(document: InputDocument, content: string, focusAreas: string[]): TestAspect[] {
  const aspects: TestAspect[] = [];

  // Usability testing
  aspects.push({
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

  return aspects;
}

function extractUserStoryAspects(document: InputDocument, content: string, focusAreas: string[]): TestAspect[] {
  const aspects: TestAspect[] = [];

  // User journey testing
  aspects.push({
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

  return aspects;
}

function generateCrossCuttingAspects(
  projectName: string,
  documentContents: { document: InputDocument; content: string }[],
  focusAreas: string[]
): TestAspect[] {
  const aspects: TestAspect[] = [];

  // Error handling and recovery
  aspects.push({
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
  aspects.push({
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

  return aspects;
}

function generateMarkdownReport(
  project: TestAspectProject,
  documentContents: { document: InputDocument; content: string }[],
  missingFiles: string[]
): string {
  const markdown = `# Test Aspects: ${project.projectName}

## Extraction Summary
- **Project**: ${project.projectName}
- **Extraction Date**: ${new Date(project.createdAt).toLocaleDateString()}
- **Status**: ${project.status}
- **Total Aspects**: ${project.aspects.length}
- **Processed Documents**: ${documentContents.length}
${missingFiles.length > 0 ? `- **Skipped Documents**: ${missingFiles.length}` : ''}

## Source Documents
${documentContents.map(doc => `- **${doc.document.type}**: ${doc.document.filePath}${doc.document.description ? ` - ${doc.document.description}` : ''}`).join('\n')}

${missingFiles.length > 0 ? `## Skipped Documents
${missingFiles.map(file => `- ${file}`).join('\n')}

` : ''}## Extracted Test Aspects

${project.aspects.map((aspect, index) => `### ${aspect.category.toUpperCase()}-${String(index + 1).padStart(3, '0')}: ${aspect.title}

- **Category**: ${aspect.category.charAt(0).toUpperCase() + aspect.category.slice(1)}
- **Priority**: ${aspect.priority.charAt(0).toUpperCase() + aspect.priority.slice(1)}
- **Source**: ${aspect.source}
- **Extracted From**: ${aspect.extractedFrom}

**Description**: ${aspect.description}

**Rationale**: ${aspect.rationale}

**Test Conditions**:
${aspect.testConditions.map(condition => `- ${condition}`).join('\n')}

**Associated Risks**:
${aspect.risks.map(risk => `- ${risk}`).join('\n')}

---
`).join('\n')}

## Next Steps

1. **Review** each test aspect for completeness and accuracy
2. **Request approval** via dashboard or use: \`approvals action:"request" category:"test-aspect"\`
3. **Refine** aspects based on review feedback
4. **Proceed** to test case design once approved

---

*Generated by extract_test_aspects tool at ${new Date().toISOString()}*
`;

  return markdown;
}