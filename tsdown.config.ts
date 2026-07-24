import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  entry: {
    index: './src/Mutex.ts',
  },
  exports: {
    packageJson: false,
  },
  format: 'esm',
  inputOptions: {
    experimental: {
      attachDebugInfo: 'none',
    },
  },
  outputOptions: {
    comments: false,
  },
})
