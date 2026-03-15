import {
  createCorsOriginMatcher,
  matchesAllowedOrigin,
  parseAllowedOrigins,
} from './cors.utils';

describe('Config | cors.utils', () => {
  describe('parseAllowedOrigins', () => {
    it('should trim empty entries', () => {
      expect(
        parseAllowedOrigins(
          'https://test.potber.de, https://*.preview.potber.de,',
        ),
      ).toStrictEqual([
        'https://test.potber.de',
        'https://*.preview.potber.de',
      ]);
    });
  });

  describe('matchesAllowedOrigin', () => {
    it('should match exact origins', () => {
      expect(
        matchesAllowedOrigin(
          'https://test.potber.de',
          'https://test.potber.de',
        ),
      ).toBe(true);
    });

    it('should match single-label wildcard preview origins', () => {
      expect(
        matchesAllowedOrigin(
          'https://*.preview.potber.de',
          'https://pr-17.preview.potber.de',
        ),
      ).toBe(true);
    });

    it('should match single-label wildcard preview.potber origins', () => {
      expect(
        matchesAllowedOrigin(
          'https://*.preview.potber.de',
          'https://pr-42.preview.potber.de',
        ),
      ).toBe(true);
    });

    it('should reject nested wildcard preview origins', () => {
      expect(
        matchesAllowedOrigin(
          'https://*.preview.potber.de',
          'https://foo.bar.preview.potber.de',
        ),
      ).toBe(false);
    });

    it('should reject mismatched ports', () => {
      expect(
        matchesAllowedOrigin(
          'https://*.preview.potber.de',
          'https://pr-17.preview.potber.de:8443',
        ),
      ).toBe(false);
    });
  });

  describe('createCorsOriginMatcher', () => {
    it('should allow requests without an origin', () => {
      const matcher = createCorsOriginMatcher([]);
      const callback = jest.fn();

      matcher(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow matching origins', () => {
      const matcher = createCorsOriginMatcher([
        'https://test.potber.de',
        'https://*.preview.potber.de',
      ]);
      const callback = jest.fn();

      matcher('https://pr-42.preview.potber.de', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-matching origins', () => {
      const matcher = createCorsOriginMatcher([
        'https://test.potber.de',
        'https://*.preview.potber.de',
      ]);
      const callback = jest.fn();

      matcher('https://invalid.preview.example.com', callback);

      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });
});
