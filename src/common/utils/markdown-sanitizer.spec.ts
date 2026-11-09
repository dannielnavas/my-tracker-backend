import { sanitizeMarkdown } from './markdown-sanitizer';

describe('sanitizeMarkdown', () => {
  it('removes script tags', () => {
    expect(sanitizeMarkdown('hello <script>alert(1)</script> world')).toBe('hello  world');
  });

  it('removes event handlers', () => {
    expect(sanitizeMarkdown('text <img src=x onerror=alert(1)> end')).toBe('text  end');
  });

  it('neutralizes javascript links', () => {
    expect(sanitizeMarkdown('[click](javascript:alert(1))')).toBe('click');
  });

  it('preserves markdown', () => {
    expect(sanitizeMarkdown('### Title\n- a\n- b')).toContain('### Title');
  });
});
