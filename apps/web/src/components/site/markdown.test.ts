import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders markdown', () => {
    const html = renderMarkdown('## Hi\n\n- **bold** [x](https://a.com)');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://a.com"');
  });
  it('escapes raw html, block and inline', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nhi <img src=x onerror=alert(1)>');
    expect(html).not.toMatch(/<script|<img src=x/i);
    expect(html).toContain('&lt;script&gt;');
  });
  it('drops javascript: links and images', () => {
    const html = renderMarkdown('[a](javascript:alert(1)) ![b](javascript:alert(2))');
    expect(html).not.toContain('javascript:');
  });
});
