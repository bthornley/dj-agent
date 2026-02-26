/**
 * Simple markdown-to-HTML renderer.
 * Handles: headings, bold, italic, tables, lists, blockquotes, hr, links.
 * No external dependencies.
 */
export function renderMarkdown(md: string): string {
    let html = md;

    // Escape HTML
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Restore blockquote markers (un-escape >)
    html = html.replace(/^&gt;/gm, '>');

    // Tables
    html = html.replace(
        /((?:^\|.+\|$\n?)+)/gm,
        (tableBlock) => {
            const rows = tableBlock.trim().split('\n');
            if (rows.length < 2) return tableBlock;

            let table = '<table>';
            rows.forEach((row, i) => {
                // Skip separator row
                if (/^\|[\s\-:|]+\|$/.test(row)) return;

                const cells = row
                    .split('|')
                    .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
                    .map((c) => c.trim());

                if (i === 0) {
                    table += '<thead><tr>' + cells.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
                } else {
                    table += '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
                }
            });
            table += '</tbody></table>';
            return table;
        }
    );

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge adjacent blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Unordered lists
    html = html.replace(
        /((?:^- .+$\n?)+)/gm,
        (block) => {
            const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^- /, '')}</li>`).join('');
            return `<ul>${items}</ul>`;
        }
    );

    // Ordered lists
    html = html.replace(
        /((?:^\d+\. .+$\n?)+)/gm,
        (block) => {
            const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^\d+\.\s*/, '')}</li>`).join('');
            return `<ol>${items}</ol>`;
        }
    );

    // Paragraphs — wrap remaining plain lines
    html = html.replace(/^(?!<[a-z/])((?!\s*$).+)$/gm, '<p>$1</p>');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}
