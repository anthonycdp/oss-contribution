import { parseEnvExample, isLikelySecret, generateEnvExample } from '../src/utils/env-parser';
import { EnvVarDefinition } from '../src/types';

describe('env-parser', () => {
  describe('parseEnvExample', () => {
    it('should parse basic environment variables', () => {
      const content = `
DATABASE_URL=postgresql://localhost:5432/db
API_KEY=
DEBUG=false
`;

      const result = parseEnvExample(content);

      expect(result).toHaveLength(3);
      expect(result[0]?.name).toBe('DATABASE_URL');
      expect(result[0]?.required).toBe(false);
      expect(result[0]?.type).toBe('url');
    });

    it('should handle variables without values (required)', () => {
      const content = 'API_KEY=';

      const result = parseEnvExample(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('API_KEY');
      expect(result[0]?.required).toBe(true);
    });

    it('should skip comments and empty lines', () => {
      const content = `
# This is a comment
DATABASE_URL=localhost

# Another comment
API_KEY=secret
`;

      const result = parseEnvExample(content);

      expect(result).toHaveLength(2);
    });

    it('should handle quoted values', () => {
      const content = `
MESSAGE="Hello World"
PATH='/usr/bin'
`;

      const result = parseEnvExample(content);

      expect(result).toHaveLength(2);
      expect(result[0]?.defaultValue).toBe('Hello World');
      expect(result[1]?.defaultValue).toBe('/usr/bin');
    });

    it('should infer boolean type', () => {
      const content = 'DEBUG=true';

      const result = parseEnvExample(content);

      expect(result[0]?.type).toBe('boolean');
    });

    it('should infer number type', () => {
      const content = 'PORT=3000';

      const result = parseEnvExample(content);

      expect(result[0]?.type).toBe('number');
    });

    it('should infer URL type from value', () => {
      const content = 'API_URL=https://api.example.com';

      const result = parseEnvExample(content);

      expect(result[0]?.type).toBe('url');
    });

    it('should infer type from variable name with value', () => {
      const content = `
APP_PORT=3000
FEATURE_ENABLED=true
`;

      const result = parseEnvExample(content);

      expect(result.find(r => r.name === 'APP_PORT')?.type).toBe('number');
      expect(result.find(r => r.name === 'FEATURE_ENABLED')?.type).toBe('boolean');
    });
  });

  describe('isLikelySecret', () => {
    it('should identify secret variables', () => {
      expect(isLikelySecret('API_KEY')).toBe(true);
      expect(isLikelySecret('SECRET_TOKEN')).toBe(true);
      expect(isLikelySecret('DATABASE_PASSWORD')).toBe(true);
      expect(isLikelySecret('AUTH_SECRET')).toBe(true);
      expect(isLikelySecret('PRIVATE_KEY')).toBe(true);
    });

    it('should not flag non-secret variables', () => {
      expect(isLikelySecret('DATABASE_URL')).toBe(false);
      expect(isLikelySecret('APP_NAME')).toBe(false);
      expect(isLikelySecret('PORT')).toBe(false);
      expect(isLikelySecret('DEBUG')).toBe(false);
    });
  });

  describe('generateEnvExample', () => {
    it('should generate valid .env.example content', () => {
      const definitions: EnvVarDefinition[] = [
        { name: 'DATABASE_URL', required: false, type: 'url' },
        { name: 'API_KEY', required: true, type: 'string', secret: true },
        { name: 'PORT', required: false, type: 'number', defaultValue: '3000' },
      ];

      const result = generateEnvExample(definitions);

      expect(result).toContain('DATABASE_URL=');
      expect(result).toContain('API_KEY=');
      expect(result).toContain('PORT=3000');
      expect(result).toContain('# Secrets');
    });

    it('should separate secrets from regular variables', () => {
      const definitions: EnvVarDefinition[] = [
        { name: 'APP_NAME', required: true, type: 'string' },
        { name: 'API_SECRET', required: true, type: 'string', secret: true },
      ];

      const result = generateEnvExample(definitions);

      const appIndex = result.indexOf('APP_NAME');
      const secretIndex = result.indexOf('API_SECRET');

      expect(appIndex).toBeLessThan(secretIndex);
    });
  });
});
