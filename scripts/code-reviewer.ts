import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse arguments (e.g., baseRef for git diff)
const baseRef = process.argv[2] || 'origin/main';
const headRef = process.argv[3] || 'HEAD';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is missing.');
    process.exit(1);
}

// 1. Read Coding Standards
const standardsPath = path.resolve(__dirname, '../data/docs/tech/GigLift_Coding_Standards.md');
if (!fs.existsSync(standardsPath)) {
    console.error(`Error: Coding standards file not found at ${standardsPath}`);
    process.exit(1);
}
const codingStandards = fs.readFileSync(standardsPath, 'utf-8');

// 2. Get Git Diff
let gitDiff = '';
try {
    gitDiff = execSync(`git diff ${baseRef}...${headRef} -- . ':(exclude)package-lock.json' ':(exclude)*.md' ':(exclude)*.pptx'`).toString();
} catch (error) {
    console.error('Error executing git diff:', error instanceof Error ? error.message : String(error));
    process.exit(1);
}

if (!gitDiff.trim()) {
    console.error('No relevant code changes found to review.');
    // Output empty JSON for GitHub Actions parser
    console.log(JSON.stringify({ pass: true, summary: "No code changes to review.", violations: [] }));
    process.exit(0);
}

// 3. Prepare OpenAI Request
const systemPrompt = `You are a strict Code Review Agent for GigLift.
Your job is to act as a gatekeeper in the CI/CD pipeline before QA runs.
You will be provided with the current codebase's strict Coding Standards, followed by a \`git diff\` of a Pull Request.

Analyze the diff and determine if ANY new code violates the Coding Standards. 
Pay extra attention to:
- Pagination (missing limit/offset in queries)
- Component Reusability (hardcoding things that should be props)
- API Route safety (missing auth/user_id checks)
- N+1 Queries
- Error Handling

If you find violations, you MUST fail the review and cite the specific rule violated. 
If the code is fully compliant, pass the review.

You MUST respond ONLY with valid JSON in the following schema:
{
  "pass": boolean,
  "summary": "A 1-2 sentence summary of your findings.",
  "violations": [
    {
      "file": "path/to/file",
      "line": "line number or general location",
      "rule": "Name of the rule from the standards",
      "issue": "Description of what is wrong",
      "suggestion": "How to fix it"
    }
  ]
}

Return an empty list for "violations" if pass is true.`;

const userPrompt = `### GIGLIFT CODING STANDARDS ###
${codingStandards}

### GIT DIFF TO REVIEW ###
${gitDiff}`;

// 4. Call OpenAI API
async function runReview() {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenAI API Error: ${response.status} - ${errorText}`);
            process.exit(1);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('Error: Unexpected empty response from OpenAI');
            process.exit(1);
        }

        const result = JSON.parse(content);

        // Output the raw JSON so the GitHub Action can capture it
        console.log(JSON.stringify(result, null, 2));

        if (!result.pass) {
            // Exit with code 1 so the GitHub Action knows to fail the build
            process.exit(1);
        }

    } catch (error) {
        console.error('Error analyzing diff with OpenAI:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

runReview();
