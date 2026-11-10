// Look: an obsidian night canvas, warm ivory type and one scarce accent, studio gold, kept for the
// selected filter and the page's main action. Flat tonal layers, hairline borders, no shadows.
const obsidian = '#0D0B0A';
const ivory = '#F4F1EA';

export default defineDot({
  // Each page is a folder under pages/. The dot opens on the first one.
  pages: ['index', 'event'],
  theme: {
    scheme: 'dark',
    shape: 'soft',
    colors: {
      primary: { light: '#D4A359', dark: '#D4A359' },
      background: { light: obsidian, dark: obsidian },
      surface: { light: '#171412', dark: '#171412' },
      muted: { light: '#24201C', dark: '#24201C' },
      border: { light: '#2C2723', dark: '#2C2723' },
      text: { light: ivory, dark: ivory },
      subtle: { light: '#A39C90', dark: '#A39C90' },
    },
  },
  configs: {
    navigationBar: { title: 'Oblee', backgroundColor: obsidian, textColor: ivory },
  },
  hooks: {
    onError(error) {
      console.error(error);
    },
  },
});
