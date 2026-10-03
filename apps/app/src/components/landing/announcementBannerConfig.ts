/** Fixed height of the rebrand announcement bar (matches AnnouncementBanner layout). */
export const ANNOUNCEMENT_BANNER_HEIGHT = '2.75rem'; // 44px

export const ANNOUNCEMENT_BANNER_HEIGHT_VAR = '--announcement-banner-height';

/** Top padding for hero content below fixed nav + optional banner. */
export function heroTopPaddingClass(withBanner: boolean): string {
  if (withBanner) {
    return 'hero-with-announcement-banner';
  }
  return 'pt-32 tablet:pt-28 desktop:pt-32';
}
