export async function fetchVercelBuildLogs(deploymentId: string): Promise<string> {
    const token = process.env.VERCEL_ACCESS_TOKEN;
    if (!token) {
        throw new Error("Missing VERCEL_ACCESS_TOKEN in environment variables");
    }

    try {
        // Fetch up to the last 100 events from the deployment, filtering by build phase
        const url = `https://api.vercel.com/v2/deployments/${deploymentId}/events?limit=100&direction=backward`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.error("Vercel API Error:", await res.text());
            throw new Error(`Failed to fetch logs from Vercel: ${res.statusText}`);
        }

        const events = await res.json();
        
        // Filter out event text and concatenate, prioritizing stderr for errors
        let logBuffer = "";
        for (const event of events) {
           if (event.type === "stderr" || event.type === "stdout") {
              // Usually the error is explicitly in stderr, but Next.js sometimes prints fatal errors in stdout
              logBuffer += event.payload.text + "\\n";
           }
        }

        return logBuffer;
    } catch (err) {
        console.error("fetchVercelBuildLogs Error:", err);
        throw err;
    }
}
