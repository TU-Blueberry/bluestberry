module.exports = {
  preset: 'jest-preset-angular',
  roots: ['<rootDir>/src/'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  setupFilesAfterEnv: ['<rootDir>/src/test.ts', "<rootDir>/src/__mocks__/globalMocks.ts"],
  collectCoverage: true,
  coverageReporters: ['html'],
  coverageDirectory: 'coverage/my-app',
  testPathIgnorePatterns: [
    '<rootDir>/src/assets/util/'
  ],
  moduleNameMapper: {
    '\\.py$': 'jest-raw-loader'
  }
};
