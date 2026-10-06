import { describe, expect, it } from 'vitest';
import {
  ATS_SAFE_DEFAULT_TEMPLATE_ID,
  ATS_SAFETY_CAPS,
  getTemplateAtsProfile,
  getTemplateById,
  resolveAtsSafeTemplateId,
} from './template-utils';

describe('getTemplateAtsProfile', () => {
  it('classifies the ATS-safe default as safe with a full cap', () => {
    const profile = getTemplateAtsProfile(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(profile.safety).toBe('safe');
    expect(profile.layoutType).toBe('single-column');
    expect(profile.cap).toBe(100);
  });

  it('classifies a sidebar V2 template as risky', () => {
    const profile = getTemplateAtsProfile('two-column-sidebar-v2');
    expect(profile.safety).toBe('risky');
    expect(profile.layoutType).toBe('sidebar-left');
    expect(profile.cap).toBe(ATS_SAFETY_CAPS.risky);
  });

  it('classifies a two-column canvas template as risky', () => {
    expect(getTemplateAtsProfile('tpl-2').safety).toBe('risky');
    expect(getTemplateAtsProfile('tpl-5').safety).toBe('risky');
  });

  it('classifies a dark sidebar canvas template as risky', () => {
    expect(getTemplateAtsProfile('tpl-9').safety).toBe('risky');
    expect(getTemplateAtsProfile('tpl-15').safety).toBe('risky');
  });

  it('classifies a single-column canvas template as safe', () => {
    expect(getTemplateAtsProfile('tpl-1').safety).toBe('safe');
    expect(getTemplateAtsProfile('tpl-6').safety).toBe('safe');
    expect(getTemplateAtsProfile('tpl-14').safety).toBe('safe');
  });

  it('treats an unknown template as caution, never as safe', () => {
    const profile = getTemplateAtsProfile('totally-made-up-template');
    expect(profile.safety).toBe('caution');
    expect(profile.cap).toBe(ATS_SAFETY_CAPS.caution);
  });

  it('treats a missing template id as the ATS-safe default', () => {
    const profile = getTemplateAtsProfile(undefined);
    expect(profile.resolvedId).toBe(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(profile.safety).toBe('safe');
  });

  it('caps are ordered safe > caution > risky', () => {
    expect(ATS_SAFETY_CAPS.safe).toBeGreaterThan(ATS_SAFETY_CAPS.caution);
    expect(ATS_SAFETY_CAPS.caution).toBeGreaterThan(ATS_SAFETY_CAPS.risky);
  });
});

describe('resolveAtsSafeTemplateId', () => {
  it('keeps a Master CV template that is already ATS-safe', () => {
    const resolution = resolveAtsSafeTemplateId('modern-minimal-v2');
    expect(resolution.templateId).toBe('modern-minimal-v2');
    expect(resolution.pinnedFrom).toBeUndefined();
  });

  it('pins a multi-column Master template to the ATS-safe default', () => {
    const resolution = resolveAtsSafeTemplateId('two-column-sidebar-v2');
    expect(resolution.templateId).toBe(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(resolution.pinnedFrom).toBe('two-column-sidebar-v2');
    expect(resolution.profile.safety).toBe('safe');
    expect(resolution.profile.cap).toBe(100);
  });

  it('pins a dark sidebar Master template to the ATS-safe default', () => {
    const resolution = resolveAtsSafeTemplateId('tpl-9');
    expect(resolution.templateId).toBe(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(resolution.pinnedFrom).toBe('tpl-9');
  });

  it('pins an unknown Master template to the ATS-safe default', () => {
    const resolution = resolveAtsSafeTemplateId('mystery-template');
    expect(resolution.templateId).toBe(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(resolution.pinnedFrom).toBe('mystery-template');
  });

  it('uses the ATS-safe default when the Master CV has no template', () => {
    const resolution = resolveAtsSafeTemplateId(null);
    expect(resolution.templateId).toBe(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    expect(resolution.pinnedFrom).toBeUndefined();
  });
});

describe('getTemplateById', () => {
  it('resolves canonical V2 ids before applying the legacy remap', () => {
    // 'professional-extended-v2' is declared single-column. The legacy map
    // sends it to tpl-3 (a sidebar), so resolving the canonical definition
    // first is what keeps its declared layout honest.
    const template = getTemplateById('professional-extended-v2');
    expect(template).not.toBeNull();
    expect(getTemplateAtsProfile('professional-extended-v2').layoutType).toBe('single-column');
  });

  it('still resolves legacy aliases', () => {
    expect(getTemplateById('tpl-1')).not.toBeNull();
    expect(getTemplateById('executive-minimal-template')).not.toBeNull();
  });

  it('returns null for an empty id', () => {
    expect(getTemplateById('')).toBeNull();
  });
});
