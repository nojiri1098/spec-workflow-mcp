#!/usr/bin/env node

import { promises as fs, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validation script for Japanese-only QA Workflow MCP
function validateTranslations() {
  console.log('🔍 Validating translation files...');

  const errors = [];
  const warnings = [];

  console.log(`📌 QA Workflow MCP - Japanese only configuration`);

  // Frontend translations checking
  const frontendTranslationsPath = path.join(__dirname, '..', 'src', 'dashboard_frontend', 'src', 'translations.json');
  console.log(`📁 Checking frontend translations: ${frontendTranslationsPath}`);

  if (!existsSync(frontendTranslationsPath)) {
    errors.push(`❌ Frontend translations file missing: translations.json`);
  } else {
    try {
      const content = readFileSync(frontendTranslationsPath, 'utf8');
      JSON.parse(content);
      console.log(`✅ Frontend translations.json: Valid JSON`);
    } catch (error) {
      errors.push(`❌ Frontend translations.json: Invalid JSON - ${error.message}`);
    }
  }

  // VSCode extension translations checking
  const vscodeTranslationsPath = path.join(__dirname, '..', 'vscode-extension', 'src', 'webview', 'translations.json');
  console.log(`📁 Checking VSCode extension translations: ${vscodeTranslationsPath}`);

  if (!existsSync(vscodeTranslationsPath)) {
    errors.push(`❌ VSCode translations file missing: translations.json`);
  } else {
    try {
      const content = readFileSync(vscodeTranslationsPath, 'utf8');
      JSON.parse(content);
      console.log(`✅ VSCode translations.json: Valid JSON`);
    } catch (error) {
      errors.push(`❌ VSCode translations.json: Invalid JSON - ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Validation Results:\n');

  if (errors.length > 0) {
    console.log('❌ Errors found:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️ Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All translation files are valid!');
  } else if (errors.length === 0) {
    console.log('✅ All translation files are valid! (with warnings)');
  }

  console.log('\n💡 Bundle Size Monitoring:');
  console.log('   Translation files are now simplified for Japanese-only support.');
  console.log('   This results in smaller bundle size and faster load times.');
  console.log('   Current implementation: Direct JSON import (optimal for single language)');

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

// Run validation
const result = validateTranslations();

if (!result.success) {
  console.log('\n❌ Validation failed');
  process.exit(1);
} else {
  console.log('\n✅ Validation passed');
  process.exit(0);
}