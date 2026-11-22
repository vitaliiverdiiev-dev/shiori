import type { Preview } from '@storybook/react-vite';
import '../src/app/styles/index.css';

const preview: Preview = {
  decorators: [
    (Story, { globals }) => {
      const dark = globals.theme === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      return Story();
    },
  ],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        dynamicTitle: true,
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
        title: 'Theme',
      },
    },
  },
  initialGlobals: { theme: 'light' },
};

export default preview;
