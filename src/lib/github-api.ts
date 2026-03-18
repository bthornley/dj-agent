import { Octokit } from "octokit";

// Hardcoded repository based on the Git remote in the workspace
const OWNER = "bthornley";
const REPO = "dj-agent";

export async function createFixPullRequest(
    filePath: string,
    newContent: string,
    branchName: string,
    commitMessage: string,
    prTitle: string,
    prBody: string
): Promise<string> {
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
        throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN in environment variables");
    }

    const octokit = new Octokit({ auth: token });

    try {
        // 1. Get the latest commit SHA of the main branch
        const { data: refData } = await octokit.rest.git.getRef({
            owner: OWNER,
            repo: REPO,
            ref: "heads/main",
        });
        const mainSha = refData.object.sha;

        // 2. Create the new fix branch
        await octokit.rest.git.createRef({
            owner: OWNER,
            repo: REPO,
            ref: `refs/heads/${branchName}`,
            sha: mainSha,
        });

        // 3. Get the existing file SHA (required to update a file via GitHub API)
        let fileSha;
        try {
            const { data: fileData } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: filePath,
                ref: branchName, // Look on our newly created branch
            });
            // Content can be an array if the path is a directory, verify it's a single file
            if (!Array.isArray(fileData) && fileData.type === "file") {
                fileSha = fileData.sha;
            }
        } catch (e: any) {
             // File not found 404 is fine (e.g. creating a brand new file), but we are usually patching.
             console.log(`Warning: File ${filePath} not found, it will be treated as new.`);
             if (e.status !== 404) throw e;
        }

        // 4. Update the file via commit
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            message: commitMessage,
            content: Buffer.from(newContent).toString("base64"), // GitHub API requires base64 encoding
            branch: branchName,
            sha: fileSha,
        });

        // 5. Create a Pull Request back to main
        const { data: prData } = await octokit.rest.pulls.create({
            owner: OWNER,
            repo: REPO,
            title: prTitle,
            head: branchName,
            base: "main",
            body: prBody,
        });

        return prData.html_url;

    } catch (error) {
        console.error("Vercel Guardian PR Creation Error:", error);
        throw error;
    }
}

export async function fetchGitHubFileContents(filePath: string): Promise<string> {
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
        throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN in environment variables");
    }

    const octokit = new Octokit({ auth: token });

    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            ref: "main",
        });

        if (!Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
            // Content is returned as base64 by Octokit
            return Buffer.from(fileData.content, "base64").toString("utf8");
        }
        
        throw new Error("Target is not a file or content is empty.");
    } catch (e: any) {
         console.error(`Error fetching raw file contents for ${filePath}`, e);
         throw e;
    }
}
