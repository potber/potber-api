const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  modulePaths: ['<rootDir>'],
  testRegex: '.*\\.(?:spec|test)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        module: {
          type: 'commonjs',
          lazy: [
            'src/posts/services/posts.services',
            'src/threads/services/threads.service',
          ],
          noInterop: true,
        },
        jsc: {
          target: 'es2021',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
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
