# Test Perspective Workflow - Minimal Implementation

## 概要

既存の spec-workflow-mcp に**テスト観点ワークフローのみ**を追加する最小実装。
既存機能への影響を最小化し、段階的にQA機能を導入する。

## ワークフロー

```
Input Documents → Extract Test Perspectives → Review → Approve/Revise
```

### フェーズ

#### Phase 1: Extract (抽出)
- **入力**: 要件仕様書、設計書、API仕様、UI/UXデザイン等
- **処理**: LLMによるテスト観点の自動抽出
- **出力**: 構造化されたテスト観点リスト

#### Phase 2: Review (レビュー)
- **入力**: 抽出されたテスト観点
- **処理**: 人間によるレビュー・フィードバック
- **出力**: 承認済みテスト観点 or 修正指示

## 技術仕様

### 1. ディレクトリ構造 (既存に追加)

```
.spec-workflow/
├── test-perspectives/           # 新規追加
│   ├── extracted/              # 抽出された観点
│   │   └── [project-name].md   # プロジェクト別テスト観点
│   └── approved/               # 承認済み観点
│       └── [project-name].md   # 承認済みテスト観点
├── approvals/                  # 既存活用
├── specs/                      # 既存保持
├── steering/                   # 既存保持
└── templates/                  # 既存に追加
    ├── requirements-template.md    # 既存
    ├── design-template.md          # 既存
    ├── tasks-template.md           # 既存
    └── test-perspective-template.md # 新規追加
```

### 2. MCPツール構成

#### 既存ツール (そのまま保持)
- `spec-workflow-guide` - 既存保持
- `steering-guide` - 既存保持
- `spec-status` - 既存保持
- `approvals` - **レビュー機能拡張**

#### 新規ツール (1つのみ)
- `extract_test_perspectives` - テスト観点抽出

### 3. TypeScript型定義 (既存に追加)

```typescript
// src/types.ts に追加
export interface TestPerspective {
  id: string;
  title: string;
  description: string;
  category: 'functional' | 'non-functional' | 'security' | 'usability';
  priority: 'high' | 'medium' | 'low';
  source: string; // 元文書への参照
  extractedFrom: string; // 抽出元の具体的箇所
  rationale: string; // なぜこの観点が重要か
  testConditions: string[]; // 具体的なテスト条件
  risks: string[]; // 関連するリスク
}

export interface TestPerspectiveProject {
  projectName: string;
  createdAt: string;
  lastModified: string;
  perspectives: TestPerspective[];
  status: 'extracted' | 'under-review' | 'approved' | 'needs-revision';
}
```

### 4. 新規MCPツール仕様

#### `extract_test_perspectives`

```typescript
export const extractTestPerspectivesTool: Tool = {
  name: 'extract_test_perspectives',
  description: `Extract test perspectives from requirement documents, design specs, and other inputs.

# Instructions
Analyze provided documents and extract comprehensive test perspectives covering:
- Functional testing angles
- Non-functional requirements (performance, security, usability)
- Edge cases and error conditions
- Integration points and dependencies
- User experience considerations

Generate structured test perspectives that can guide test case design.`,
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
            filePath: { type: 'string' },
            type: {
              type: 'string',
              enum: ['requirements', 'design', 'api-spec', 'ui-design', 'user-story']
            },
            description: { type: 'string' }
          }
        },
        description: 'List of input documents to analyze for test perspectives'
      },
      focusAreas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific areas to focus on (optional)'
      }
    },
    required: ['projectPath', 'projectName', 'inputDocuments']
  }
};
```

### 5. approvals ツール拡張

#### 新しいカテゴリ追加
```typescript
// src/tools/approvals.ts 修正
category: {
  type: 'string',
  enum: ['spec', 'steering', 'test-perspective'], // test-perspective 追加
  description: 'Category - "test-perspective" for test perspective reviews'
}
```

#### テスト観点レビューフロー
1. **抽出完了** → approval request (test-perspective)
2. **レビュー実施** → ダッシュボードでフィードバック
3. **承認/修正** → 承認済みディレクトリに移動 or 修正指示

### 6. テンプレート

#### `test-perspective-template.md`
```markdown
# Test Perspectives: [Project Name]

## Extraction Summary
- **Source Documents**: [List of analyzed documents]
- **Extraction Date**: [YYYY-MM-DD]
- **Focus Areas**: [Specified focus areas if any]

## Functional Test Perspectives

### FTP-001: [Perspective Title]
- **Category**: Functional
- **Priority**: High/Medium/Low
- **Description**: [What aspect to test]
- **Source**: [Document reference]
- **Test Conditions**:
  - [Condition 1]
  - [Condition 2]
- **Risks**: [Associated risks]

## Non-Functional Test Perspectives

### NFP-001: [Perspective Title]
- **Category**: Performance/Security/Usability
- **Priority**: High/Medium/Low
- **Description**: [What aspect to test]
- **Source**: [Document reference]
- **Test Conditions**:
  - [Condition 1]
  - [Condition 2]
- **Risks**: [Associated risks]

## Security Test Perspectives

### STP-001: [Perspective Title]
- **Category**: Security
- **Priority**: High/Medium/Low
- **Description**: [What aspect to test]
- **Source**: [Document reference]
- **Test Conditions**:
  - [Condition 1]
  - [Condition 2]
- **Risks**: [Associated risks]

## Usability Test Perspectives

### UTP-001: [Perspective Title]
- **Category**: Usability
- **Priority**: High/Medium/Low
- **Description**: [What aspect to test]
- **Source**: [Document reference]
- **Test Conditions**:
  - [Condition 1]
  - [Condition 2]
- **Risks**: [Associated risks]
```

### 7. ダッシュボード対応 (最小限)

#### 新規ページ追加
- **Test Perspectives View** - 抽出されたテスト観点の一覧・詳細表示
- 既存のApprovals画面でテスト観点レビュー対応

### 8. 実装タスク

#### Phase 1: 基盤準備 (1週間)
- [ ] TypeScript型定義追加 (`src/types.ts`)
- [ ] ディレクトリ構造作成 (`test-perspectives/`)
- [ ] テンプレート作成 (`test-perspective-template.md`)

#### Phase 2: ツール実装 (1-2週間)
- [ ] `extract_test_perspectives` ツール実装
- [ ] `approvals` ツールのtest-perspective対応
- [ ] ツール統合 (`src/tools/index.ts`)

#### Phase 3: ダッシュボード (1週間)
- [ ] Test Perspectives表示画面
- [ ] Approvals画面のtest-perspective対応

#### Phase 4: テスト・統合 (0.5週間)
- [ ] 機能テスト
- [ ] 既存機能への影響確認

### 9. 使用例

```bash
# 1. テスト観点抽出
extract_test_perspectives projectPath:"/path/to/project" projectName:"UserAuth" inputDocuments:[
  {filePath:"requirements.md", type:"requirements"},
  {filePath:"api-spec.yaml", type:"api-spec"}
]

# 2. レビュー依頼
approvals action:"request" category:"test-perspective"
  title:"UserAuth Test Perspectives Review"
  filePath:"test-perspectives/extracted/UserAuth.md"

# 3. レビュー状況確認
approvals action:"status" approvalId:"[generated-id]"
```

### 10. 成功指標

- ✅ 既存機能に影響なし
- ✅ テスト観点の自動抽出が動作
- ✅ レビューフローが完動作
- ✅ 承認済み観点が適切に管理される
- ✅ ダッシュボードで状況確認可能

### 11. 次のステップ (将来拡張)

この基盤が確立された後：
1. テストケース生成機能追加
2. テスト実行管理機能追加
3. 他のQAツール統合
4. 完全なQAワークフローへの拡張

---

## 実装開始

このミニマル設計で実装を開始し、テスト観点ワークフローの価値を検証する。