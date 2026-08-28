import { externalClientBundle } from './scripts/client-build.mjs';
export default externalClientBundle('dsh-better-display', ['lib/types/dsh-better-display.js'], {
  clientEntry: 'src/client/index.tsx',
});
