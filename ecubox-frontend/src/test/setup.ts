import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Aísla el DOM entre tests: sin esto, lo renderizado por un test persiste y
// contamina los siguientes (los queries por rol/nombre lo enmascaraban).
afterEach(() => {
  cleanup();
});
