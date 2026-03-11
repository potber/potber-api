import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  modulePaths: ['<rootDir>'],
  testRegex: '.*\\.(?:spec|test)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(msw|until-async)/)'],
  collectCoverageFrom: ['src/**/*.(t|j)s', 'src/*app*.(t|j)s'],
  coverageDirectory: '../coverage',
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'main.ts',
    'module.ts',
    'resources',
    'types',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

export default config;
