module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@game/(.*)$': '<rootDir>/src/game/$1',
    '^@combat/(.*)$': '<rootDir>/src/combat/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@progression/(.*)$': '<rootDir>/src/progression/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@render/(.*)$': '<rootDir>/src/render/$1',
    '^@audio/(.*)$': '<rootDir>/src/audio/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
};
