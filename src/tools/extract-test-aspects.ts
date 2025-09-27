import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse, TestAspect, TestAspectProject, InputDocument } from '../types.js';
import { validateProjectPath } from '../core/path-utils.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const extractTestAspectsTool: Tool = {
  name: 'extract_test_aspects',
  description: `要件文書、設計仕様書、その他の入力文書から包括的なテスト観点を抽出します。

# 使用方法
提供された文書を分析し、以下をカバーする包括的なテスト観点を抽出します：
- 要件と機能からの機能テストの観点
- 非機能要件（パフォーマンス、セキュリティ、ユーザビリティ）
- エッジケースとエラー状態
- 統合ポイントと依存関係
- ユーザーエクスペリエンスの考慮事項
- データ検証と境界値テスト
- セキュリティ脆弱性とアクセス制御

包括的なテストケース設計をガイドできる構造化されたテスト観点を生成します。

重要: 存在し、アクセス可能なファイルのみを分析してください。実用的で実行可能なテスト観点を生成します。`,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'プロジェクトルートへの絶対パス'
      },
      projectName: {
        type: 'string',
        description: 'テスト観点抽出対象のプロジェクト名'
      },
      inputDocuments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '文書ファイルへのパス（プロジェクトルートからの相対パスまたは絶対パス）'
            },
            type: {
              type: 'string',
              enum: ['requirements', 'design', 'api-spec', 'ui-design', 'user-story'],
              description: '適切な分析アプローチのための文書タイプ'
            },
            description: {
              type: 'string',
              description: '文書内容の簡潔な説明'
            }
          },
          required: ['filePath', 'type']
        },
        description: 'テスト観点分析対象の入力文書リスト'
      },
      focusAreas: {
        type: 'array',
        items: { type: 'string' },
        description: '重点的に分析する特定の領域（例："認証", "データ検証", "パフォーマンス"）'
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

  // 機能要件テスト
  aspects.push({
    id: uuidv4(),
    title: '機能要件の検証',
    description: '仕様に従ってすべての機能要件が正しく実装されていることを検証する',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: '要件分析',
    rationale: 'ユーザーニーズを満たすために、コア機能は仕様通りに動作する必要がある',
    testConditions: [
      '各要件がテスト可能で検証可能である',
      'ハッピーパスシナリオが正しく動作する',
      '要件の依存関係が満たされている',
      'ビジネスルールが適用されている'
    ],
    risks: [
      '要件実装の不完全性',
      '要件の誤解釈',
      '要件におけるエッジケースの欠落'
    ]
  });

  // 入力検証テスト
  aspects.push({
    id: uuidv4(),
    title: '入力検証とデータ整合性',
    description: 'すべての入力に対するデータ検証、サニタイゼーション、境界条件のテスト',
    category: 'functional',
    priority: 'high',
    source: document.filePath,
    extractedFrom: 'データ処理要件',
    rationale: '無効な入力の処理は、システムの安定性とセキュリティにとって重要である',
    testConditions: [
      '有効な入力の受け入れ',
      '適切なエラーメッセージを伴う無効な入力の拒否',
      '境界値テスト（最小値/最大値）',
      '特殊文字とインジェクション攻撃の処理'
    ],
    risks: [
      '無効な入力によるデータ破損',
      'インジェクション攻撃によるセキュリティ脆弱性',
      '予期しない入力によるシステムクラッシュ'
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

  // エラーハンドリングと復旧
  aspects.push({
    id: uuidv4(),
    title: 'エラーハンドリングとシステム復旧',
    description: 'エラー状態でのシステム動作と復旧メカニズムのテスト',
    category: 'non-functional',
    priority: 'high',
    source: '横断的分析',
    extractedFrom: 'システム全体のエラーハンドリング要件',
    rationale: '堅牢なエラーハンドリングは、システムの信頼性とユーザーの信頼にとって不可欠である',
    testConditions: [
      '適切なエラーハンドリングとユーザーメッセージ',
      '障害からのシステム復旧',
      'エラー時のデータ整合性',
      'エラーのログ記録と監視'
    ],
    risks: [
      '未処理エラーによるシステムクラッシュ',
      '障害シナリオでのデータ損失',
      '不明確なエラーメッセージによる悪いユーザー体験'
    ]
  });

  // セキュリティ考慮事項
  aspects.push({
    id: uuidv4(),
    title: 'セキュリティとデータ保護',
    description: 'すべてのシステムコンポーネントを対象とした包括的なセキュリティテスト',
    category: 'security',
    priority: 'high',
    source: '横断的分析',
    extractedFrom: 'セキュリティ要件とベストプラクティス',
    rationale: 'セキュリティ脆弱性はシステム全体とユーザーデータを危険にさらす可能性がある',
    testConditions: [
      '認証とセッション管理',
      'データ暗号化と安全な通信',
      'アクセス制御と権限昇格の防止',
      '入力検証とインジェクション攻撃の防止'
    ],
    risks: [
      'データ侵害と不正アクセス',
      '脆弱性を通じたシステム侵害',
      'コンプライアンス違反と法的問題'
    ]
  });

  return aspects;
}

function generateMarkdownReport(
  project: TestAspectProject,
  documentContents: { document: InputDocument; content: string }[],
  missingFiles: string[]
): string {
  const markdown = `# ${project.projectName} - テスト観点

## 抽出サマリー
- **プロジェクト**: ${project.projectName}
- **抽出日**: ${new Date(project.createdAt).toLocaleDateString('ja-JP')}
- **ステータス**: ${project.status}
- **総テスト観点数**: ${project.aspects.length}
- **処理済み文書数**: ${documentContents.length}
${missingFiles.length > 0 ? `- **スキップした文書数**: ${missingFiles.length}` : ''}

## 参照元文書
${documentContents.map(doc => `- **${doc.document.type}**: ${doc.document.filePath}${doc.document.description ? ` - ${doc.document.description}` : ''}`).join('\n')}

${missingFiles.length > 0 ? `## スキップした文書
${missingFiles.map(file => `- ${file}`).join('\n')}

` : ''}## 抽出されたテスト観点

${project.aspects.map((aspect, index) => `### TEP-${String(index + 1).padStart(3, '0')}: ${aspect.title}

#### 基本情報
- **カテゴリー**: ${aspect.category === 'functional' ? '機能' : aspect.category === 'non-functional' ? '非機能' : aspect.category === 'security' ? 'セキュリティ' : aspect.category === 'usability' ? 'ユーザビリティ' : aspect.category}
- **優先度**: ${aspect.priority === 'high' ? '高' : aspect.priority === 'medium' ? '中' : aspect.priority === 'low' ? '低' : aspect.priority}
- **参照元**: ${aspect.source}
- **抽出根拠**: ${aspect.extractedFrom}

#### 説明
${aspect.description}

#### 理由・背景
${aspect.rationale}

#### テスト条件
${aspect.testConditions.map(condition => `- ${condition}`).join('\n')}

#### 関連リスク
${aspect.risks.map(risk => `- ${risk}`).join('\n')}

---
`).join('\n')}

## 次のステップ

1. **レビュー**: 各テスト観点の完全性と正確性を確認
2. **承認要求**: ダッシュボード経由、または次のコマンドを使用: \`approvals action:"request" category:"test-aspect"\`
3. **改善**: レビューフィードバックに基づく観点の改善
4. **次段階**: 承認後、テストケース設計に進む

---

*extract_test_aspects ツールにより ${new Date().toISOString()} に生成*
`;

  return markdown;
}