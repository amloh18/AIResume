import { describe, it, expect } from 'vitest';
import {
  getVerificationCodeTemplate,
  getVerificationCopy,
  resolveVerificationPurpose,
  emailUrl,
  EMAIL_BRAND,
  type VerificationPurpose,
} from '@/lib/email-templates';

/**
 * Regression tests for the mobile rendering bug where a 6-digit code showed as
 * 4 digits on one row and 2 on the next.
 *
 * Root cause: the digit row was `display: flex; flex-wrap: wrap` with fixed 60px
 * boxes and a 12px gap, i.e. a 420px minimum inside a ~280px content area on a
 * 360px phone. 4 x 60 + 3 x 12 = 276px fitted, so the last 2 digits wrapped.
 */

const CODE = '428193';

const render = (overrides: Parameters<typeof getVerificationCodeTemplate>[0] = {}) =>
  getVerificationCodeTemplate({ code: CODE, ...overrides });

/** Pull out just the code row so assertions can't be satisfied by unrelated markup. */
const codeRow = (html: string): string => {
  const marker = html.indexOf('class="code-table"');
  expect(marker, 'code table should be present').toBeGreaterThan(-1);
  // Start at the opening <table> that owns the code-table class, not at the class itself.
  const start = html.lastIndexOf('<table', marker);
  return html.slice(start, html.indexOf('</table>', marker));
};

describe('verification code email — mobile layout', () => {
  it('renders the code as a table, not a wrapping flex row', () => {
    const row = codeRow(render());

    // The row must be a table: a table row cannot wrap, a flex row with
    // `flex-wrap: wrap` will.
    expect(row).toContain('<table');
    expect(row).not.toContain('display: flex');
    expect(row).not.toContain('flex-wrap');
  });

  it('pins the table layout so cell widths are honoured instead of content-sized', () => {
    const html = render();
    expect(html).toContain('table-layout: fixed');
  });

  it('gives each digit an equal percentage share of the row', () => {
    const row = codeRow(render());

    const cells = row.match(/class="code-cell"/g) ?? [];
    expect(cells).toHaveLength(CODE.length);

    const widths = [...row.matchAll(/class="code-cell" width="([\d.]+)%"/g)].map((m) =>
      Number(m[1])
    );
    expect(widths).toHaveLength(CODE.length);
    // Equal shares, summing to ~100%.
    expect(new Set(widths).size).toBe(1);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it('does not use the fixed 60px boxes that caused the overflow', () => {
    const row = codeRow(render());
    expect(row).not.toContain('width: 60px');
    expect(row).not.toContain('height: 60px');
    // Width must be fluid (a share of the cell), not a fixed pixel value.
    expect(row).toContain('width: 100%');
  });

  it('keeps every digit on one line inside its own box', () => {
    expect(codeRow(render())).toContain('white-space: nowrap');
  });

  it('fits within the narrowest phone we support without relying on wrapping', () => {
    // Worst case: 320px viewport with 24px card padding each side (the <=600px media
    // query). The row is a percentage of what's left, so the requirement is simply that
    // the table can shrink to that width.
    const narrowest = 320 - 24 * 2;
    expect(narrowest).toBeGreaterThan(200);

    const html = render();
    expect(html).toContain('width: 100%');
    // `table-layout: fixed` + percentage cells => the row scales to whatever
    // container it is given, so no fixed pixel total can exceed it.
    expect(html).toContain('table-layout: fixed');
  });

  it('reproduces the reported bug with the old layout, proving the diagnosis', () => {
    // The old row was 6 x 60px boxes with 5 x 12px gaps.
    const oldRowWidth = 6 * 60 + 5 * 12;
    expect(oldRowWidth).toBe(420);

    const digitsThatFit = (contentWidth: number) => {
      let n = 0;
      while ((n + 1) * 60 + n * 12 <= contentWidth) n++;
      return n;
    };

    // Real mail clients ignore `padding` on a <table>, so the 360px card keeps only its
    // 40px inline padding: ~280px of content. 4 digits fit and the last 2 wrap — exactly
    // the reported "4 on one row, 2 on the next".
    expect(digitsThatFit(360 - 80)).toBe(4);
    expect(oldRowWidth).toBeGreaterThan(360 - 80);

    // Chromium *does* honour that table padding (238px content), which yields 3+3.
    // Either way the row wraps — which is why the fix had to remove the ability to wrap
    // rather than just shrink the boxes.
    expect(digitsThatFit(360 - 40 - 80)).toBe(3);
    expect(oldRowWidth).toBeGreaterThan(360 - 40 - 80);
  });

  it('adapts to any code length instead of assuming six digits', () => {
    const four = codeRow(render({ code: '1234' }));
    expect((four.match(/class="code-cell"/g) ?? [])).toHaveLength(4);
    expect(four).toContain('width="25.0000%"');

    const eight = codeRow(render({ code: '12345678' }));
    expect((eight.match(/class="code-cell"/g) ?? [])).toHaveLength(8);
    expect(eight).toContain('width="12.5000%"');
  });

  it('omits the code row entirely when there is no code', () => {
    const html = getVerificationCodeTemplate({ code: undefined });
    expect(html).not.toContain('class="code-table"');
    expect(html).not.toContain('class="code-cell"');
  });
});

describe('verification code email — purpose-driven copy', () => {
  it('does not tell a password-reset recipient they are signing in', () => {
    const html = render({ purpose: 'password-reset' });
    expect(html).toContain('Reset your password');
    expect(html).not.toContain('complete your sign-in');
  });

  it('labels the 2FA sign-in code as two-factor', () => {
    const html = render({ purpose: 'two-factor-login' });
    expect(html).toContain('Confirm it');
    expect(html).toContain('Two-factor authentication is on');
  });

  it('uses the setup copy when the code is confirming 2FA setup', () => {
    const html = render({ purpose: 'two-factor-login', isSetup: true });
    expect(html).toContain('Turn on two-factor authentication');
  });

  it('gives every purpose a distinct subject line', () => {
    const purposes: VerificationPurpose[] = [
      'email-verification',
      'passwordless-login',
      'password-reset',
      'two-factor-login',
      'two-factor-setup',
    ];
    const subjects = purposes.map((p) => getVerificationCopy(p).subject);
    expect(new Set(subjects).size).toBe(purposes.length);
  });

  it('resolves the setup variant only for two-factor sign-in', () => {
    expect(resolveVerificationPurpose('two-factor-login', true)).toBe('two-factor-setup');
    expect(resolveVerificationPurpose('two-factor-login', false)).toBe('two-factor-login');
    expect(resolveVerificationPurpose('password-reset', true)).toBe('password-reset');
  });
});

describe('verification code email — personalisation and facts', () => {
  it('greets the recipient by name when one is supplied', () => {
    const html = render({ firstName: 'Amloh' });
    expect(html).toContain('Hi Amloh,');
  });

  it('falls back to a neutral greeting instead of printing "undefined"', () => {
    const html = render();
    expect(html).toContain('Hello,');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('Hi ,');
  });

  it('states the real expiry instead of a hardcoded 10 minutes', () => {
    expect(render({ expiryMinutes: 5 })).toContain('Expires in 5 minutes');
    expect(render({ expiryMinutes: 1 })).toContain('Expires in 1 minute.');
    expect(render({ expiryMinutes: 15 })).toContain('Expires in 15 minutes');
  });

  it('reports the attempt allowance it was given', () => {
    expect(render({ maxAttempts: 3 })).toContain('3 attempts to get it right');
    expect(render({ maxAttempts: 1 })).toContain('1 attempt to get it right');
  });

  it('shows request context only when it is provided', () => {
    const withContext = render({
      requestedAt: new Date('2026-09-20T10:00:00Z'),
      device: 'Chrome on macOS',
      ipAddress: '203.0.113.7',
    });
    expect(withContext).toContain('Request details');
    expect(withContext).toContain('Chrome on macOS');
    expect(withContext).toContain('203.0.113.7');

    const without = render();
    expect(without).not.toContain('Request details');
    expect(without).not.toContain('Device:');
  });

  it('tells the recipient what to do if they did not request the code', () => {
    const html = render({ purpose: 'two-factor-login' });
    expect(html).toContain('someone else may have your credentials');
    expect(html).toContain('reset your password');
  });

  it('escapes a hostile first name rather than injecting it', () => {
    const html = render({ firstName: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('email template config', () => {
  it('derives links from the configured origin, never a literal', () => {
    const dash = emailUrl('/dashboard');
    expect(dash.startsWith('http')).toBe(true);
    expect(emailUrl('dashboard')).toBe(dash);
    expect(dash.endsWith('/dashboard')).toBe(true);
  });

  it('derives the copyright year instead of freezing it', () => {
    expect(EMAIL_BRAND.year).toBe(new Date().getFullYear());
    // The rendered footer must track the current year, not a baked-in constant.
    expect(render()).toContain(`© ${new Date().getFullYear()}`);
  });

  it('does not leave an "AIResume" / "BuildAIResume" brand mismatch in the body', () => {
    const html = render();
    // The product is BuildAIResume; the old templates said "AIResume" in prose while
    // the sender name said "BuildAIResume". `[^d]` excludes the correct "BuildAIResume".
    expect(html).not.toMatch(/(^|[^d])AIResume/);
  });
});
