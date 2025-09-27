# QA Workflow MCP

[![npm version](https://img.shields.io/npm/v/@pimzino/spec-workflow-mcp)](https://www.npmjs.com/package/@pimzino/spec-workflow-mcp)
[![VSCode Extension](https://badgen.net/vs-marketplace/v/Pimzino.spec-workflow-mcp)](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp)

A Model Context Protocol (MCP) server for QA engineers to extract test perspectives, design test cases, and manage testing workflows with AI assistance.

## ☕ Support This Project

<a href="https://buymeacoffee.com/Pimzino" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## 🎯 QA Workflow Overview

### **Test Perspective Extraction → Review → Test Case Design**

Transform requirements, design documents, and specifications into comprehensive test perspectives with AI-powered analysis.

## ✨ Key Features

- **🔍 Test Perspective Extraction** - AI-powered analysis of requirements, design docs, and specifications
- **📋 Structured Test Workflows** - Organize perspectives by functional, security, performance, and usability categories
- **✅ Review & Approval System** - Collaborative review process with feedback and revision tracking
- **📊 Real-Time QA Dashboard** - Monitor test perspective extraction and review progress
- **🔄 Iterative Refinement** - Continuous improvement of test perspectives based on feedback
- **🌍 Multi-Language Support** - Available in 11 languages including Japanese

## 🧪 Current QA Tools

### **Core Testing Tools**
- **`extract_test_perspectives`** - Extract comprehensive test perspectives from documents
- **`approvals`** - Review and approve test perspectives with team collaboration
- **`spec-status`** - Track progress of test perspective extraction and review

### **Document Analysis**
- **Requirements Analysis** - Extract functional and non-functional test perspectives
- **Design Document Analysis** - Identify integration points and architectural test needs
- **API Specification Testing** - Generate API contract and security test perspectives
- **UI/UX Testing** - Extract usability and accessibility test considerations
- **Risk-Based Testing** - Analyze past issues and identify high-risk areas

## 🌍 Supported Languages

🇺🇸 English • 🇯🇵 日本語 • 🇨🇳 中文 • 🇪🇸 Español • 🇧🇷 Português • 🇩🇪 Deutsch • 🇫🇷 Français • 🇷🇺 Русский • 🇮🇹 Italiano • 🇰🇷 한국어 • 🇸🇦 العربية

## 🚀 Quick Start

### Step 1: Add to your AI tool

Add to your MCP configuration (see client-specific setup below):

```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

With auto-started dashboard:
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project", "--AutoStartDashboard"]
    }
  }
}
```

### Step 2: Choose your interface

**Option A: Web Dashboard** (Required for CLI users)
```bash
npx -y @pimzino/spec-workflow-mcp@latest /path/to/your/project --dashboard
```

**Option B: VSCode Extension** (Recommended for VSCode users)

Install [Spec Workflow MCP Extension](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp) from the VSCode marketplace.

## 📝 How to Use

Extract test perspectives from your project documents:

- **"Extract test perspectives from requirements.md"** - Analyze requirements for test coverage
- **"Review test perspectives for user authentication"** - Start collaborative review process
- **"Show test perspective status"** - Check extraction and review progress

### Example Workflow

```bash
# 1. Extract test perspectives from multiple documents
extract_test_perspectives projectPath:"/path/to/project" projectName:"UserAuth" inputDocuments:[
  {filePath:"requirements.md", type:"requirements"},
  {filePath:"api-spec.yaml", type:"api-spec"},
  {filePath:"ui-wireframes.md", type:"ui-design"}
]

# 2. Request team review
approvals action:"request" category:"test-perspective"
  title:"UserAuth Test Perspectives Review"
  filePath:"test-perspectives/extracted/UserAuth.md"

# 3. Check review status
approvals action:"status" approvalId:"[generated-id]"

# 4. View overall progress
spec-status projectPath:"/path/to/project" specName:"UserAuth"
```

## 🔧 MCP Client Setup

<details>
<summary><strong>Claude Code CLI</strong></summary>

Add to your MCP configuration:
```bash
claude mcp add qa-workflow npx @pimzino/spec-workflow-mcp@latest -- /path/to/your/project
```

**Important Notes:**
- The `-y` flag bypasses npm prompts for smoother installation
- The `--` separator ensures the path is passed to the script, not to npx
- Replace `/path/to/your/project` with your actual project directory path

**Alternative for Windows (if the above doesn't work):**
```bash
claude mcp add qa-workflow cmd.exe /c "npx @pimzino/spec-workflow-mcp@latest /path/to/your/project"
```
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```

Or with auto-started dashboard:
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project", "--AutoStartDashboard"]
    }
  }
}
```
</details>

<details>
<summary><strong>Cline/Claude Dev</strong></summary>

Add to your MCP server configuration:
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```
</details>

<details>
<summary><strong>Continue IDE Extension</strong></summary>

Add to your Continue configuration:
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```
</details>

<details>
<summary><strong>Cursor IDE</strong></summary>

Add to your Cursor settings (`settings.json`):
```json
{
  "mcpServers": {
    "qa-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "/path/to/your/project"]
    }
  }
}
```
</details>

## 📚 Documentation

- [Test Perspective Workflow](TEST_PERSPECTIVE_WORKFLOW.md) - Detailed workflow guide
- [QA Migration Plan](QA_WORKFLOW_MIGRATION_PLAN.md) - Complete migration design
- [Implementation Tasks](QA_WORKFLOW_IMPLEMENTATION_TASKS.md) - Development roadmap

## 📁 Project Structure

```
your-project/
  .spec-workflow/
    test-perspectives/
      extracted/          # AI-extracted test perspectives
      approved/           # Reviewed and approved perspectives
    approvals/            # Review workflow management
    templates/            # QA-specific templates
    config.toml          # QA workflow configuration
```

## 🛠️ Development

Built with modern tools for fast development:

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run in development mode
bun run dev

# Run with dashboard
bun run dev . --dashboard
```

## 🎯 QA Workflow Benefits

### **For QA Engineers**
- **Comprehensive Coverage** - AI identifies test perspectives you might miss
- **Structured Approach** - Organize testing by categories and priorities
- **Team Collaboration** - Built-in review and approval workflow
- **Documentation** - Auto-generated test perspective documentation

### **For QA Teams**
- **Consistency** - Standardized test perspective extraction process
- **Knowledge Sharing** - Review system captures team expertise
- **Progress Tracking** - Visual dashboards for workflow monitoring
- **Quality Assurance** - Multi-stage review before test case creation

### **For Projects**
- **Early Testing** - Identify test needs during requirements phase
- **Risk Mitigation** - AI-powered risk analysis and test prioritization
- **Efficiency** - Reduce time from requirements to test design
- **Traceability** - Link test perspectives back to source documents

## 🔄 Roadmap

### **Current (v1.0)**
- ✅ Test perspective extraction from documents
- ✅ Review and approval workflow
- ✅ Real-time dashboard
- ✅ Multi-document analysis

### **Next (v1.1)**
- 🔄 Test case generation from perspectives
- 🔄 Test execution tracking
- 🔄 Integration with test management tools
- 🔄 Advanced risk analysis

### **Future (v2.0)**
- 📋 Test automation script generation
- 📋 CI/CD integration
- 📋 Advanced analytics and reporting
- 📋 ML-powered test optimization

## 📄 License

GPL-3.0

## ⭐ Star History

<a href="https://www.star-history.com/#Pimzino/spec-workflow-mcp&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Pimzino/spec-workflow-mcp&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Pimzino/spec-workflow-mcp&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Pimzino/spec-workflow-mcp&type=Date" />
 </picture>
</a>

---

**Transform your testing workflow with AI-powered test perspective extraction and collaborative review processes.**