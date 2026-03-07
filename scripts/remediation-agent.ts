import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { execSync } from 'child_process';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY is missing.');
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// The Code Review Agent outputs a JSON string containing violations
// We pass this JSON as the first argument to the Remediation Agent
const violationsJson = process.argv[2];

if (!violationsJson) {
    console.error('❌ Error: No violations JSON provided.');
    process.exit(1);
}

interface Violation {
    file: string;
    line: number;
    rule: string;
    issue: string;
    suggestion: string;
}

interface ReviewResult {
    summary: string;
    violations: Violation[];
}

let result: ReviewResult;
try {
    result = JSON.parse(violationsJson);
} catch (e) {
    console.error('❌ Error: Failed to parse violations JSON.', e);
    process.exit(1);
}

if (!result.violations || result.violations.length === 0) {
    console.log('✅ No violations to remediate. Exiting.');
    process.exit(0);
}

// Group violations by file so we can fix a file in one pass
const violationsByFile: Record<string, Violation[]> = {};
for (const v of result.violations) {
    if (!violationsByFile[v.file]) {
        violationsByFile[v.file] = [];
    }
    violationsByFile[v.file].push(v);
}

async function remediateFile(filePath: string, violations: Violation[]) {
    console.log(`\n🛠️  Remediating ${filePath}...`);

    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        return false;
    }

    const sourceCode = fs.readFileSync(absolutePath, 'utf8');

    const prompt = `You are an expert strict TypeScript / Next.js remediation agent.
Your job is to fix coding standard violations in the provided source code.
You MUST output ONLY the raw, patched file contents. 
DO NOT INCLUDE MARKDOWN CODE BLOCKS (e.g. \`\`\`typescript).
DO NOT INCLUDE ANY EXPLANATIONS OR COMMENTS ABOUT WHAT YOU DID.
I need to pipe your exact output directly into the file, so any extra text will break the build.

Here are the specific violations found in this file that you MUST fix:
${violations.map(v => `- Line ${v.line} (${v.rule}): ${v.issue}. Suggested fix: ${v.suggestion}`).join('\n')}

Original Source Code:
=====================
${sourceCode}
=====================

Output ONLY the completely patched file contents below:`

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4-turbo',
            temperature: 0.1, // extremely low temp for consistent code output
        });

        let patchedCode = completion.choices[0]?.message?.content || '';

        // Failsafe: strip markdown blocks if the LLM gets stubborn
        if (patchedCode.startsWith('\`\`\`')) {
            patchedCode = patchedCode.replace(/^\`\`\`[a-z]*\n/, '').replace(/\n\`\`\`$/, '');
        }

        fs.writeFileSync(absolutePath, patchedCode);
        console.log(`✅ Applied fix to ${filePath}`);

        // Format the file so we don't commit ugly syntax
        try {
            execSync(`npx eslint "${absolutePath}" --fix`, { stdio: 'ignore' });
            console.log(`✅ Formatted ${filePath}`);
        } catch (e) {
            console.warn(`⚠️ Warning: ESLint auto-format failed on ${filePath}. Committing anyway.`);
        }

        return true;
    } catch (e: any) {
        console.error(`❌ Error calling OpenAI for ${filePath}: ${e.message}`);
        return false;
    }
}

async function run() {
    console.log(`🤖 Starting Remediation Agent on ${result.violations.length} violations across ${Object.keys(violationsByFile).length} files...`);

    let allSucceeded = true;
    let fixedFiles = 0;

    for (const [file, violations] of Object.entries(violationsByFile)) {
        const success = await remediateFile(file, violations);
        if (success) {
            fixedFiles++;
        } else {
            allSucceeded = false;
        }
    }

    console.log(`\n🎉 Remediation complete! Successfully patched ${fixedFiles}/${Object.keys(violationsByFile).length} files.`);

    // We intentionally exit 0 even if some failed so we can still commit the files we *did* fix.
    process.exit(0);
}

run();
