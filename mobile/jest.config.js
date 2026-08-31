module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Several RN packages publish ESM/TypeScript entry points. This smoke test
  // imports the complete app graph, so transform dependencies consistently.
  transformIgnorePatterns: [],
};
