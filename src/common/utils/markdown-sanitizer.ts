/**
 * Sanitize LLM Markdown output before returning in `content`.
 * Strips raw HTML vectors (<script>, <style>, <iframe>, event handlers,
 * javascript:/data:text/html links). Normal markdown is preserved.
 */
export function sanitizeMarkdown(input: string): string {
  if (!input) return '';
  let out = input;

  // Remove dangerous tags entirely (content included) for script/style/iframe/object/embed/form/link/meta
  out = out.replace(
    /<(script|style|iframe|object|embed|form|link|meta|base)[\s\S]*?<\/\1>/gi,
    '',
  );
  // Self-closing / unclosed dangerous tags
  out = out.replace(
    /<(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*\/?>/gi,
    '',
  );

  // Strip event handler attributes: on*=
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Neutralize javascript: / data:text/html: / vbscript: in href/src urls
  out = out.replace(
    /\b(href|src)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi,
    (match, _attr: string, quoted: string, dq?: string, sq?: string) => {
      const val = (dq ?? sq ?? quoted ?? '')
        .replace(/^["']|["']$/g, '')
        .trim();
      if (/^\s*(javascript|vbscript|data\s*:\s*text\/html)/i.test(val))
        return '';
      return match;
    },
  );

  // Markdown links with javascript: [x](javascript:...) -> plain text (handles nested parens like alert(1))
  out = out.replace(
    /\[([^\]]*)\]\(\s*(javascript|vbscript|data\s*:\s*text\/html)(?:[^)(]+|\([^)]*\))*\)/gi,
    '$1',
  );

  // Strip any remaining raw HTML tags but keep inner text
  out = out.replace(/<[^>]*>/g, '');

  return out.trim();
}

export function containsUnsafeContent(input: string): boolean {
  return (
    /<(script|style|iframe|object|embed|form)\b/i.test(input) ||
    /javascript\s*:/i.test(input)
  );
}
