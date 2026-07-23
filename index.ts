import { registerRootComponent } from 'expo';

import App from './App';

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Each child in a list should have a unique "key" prop')) {
    return; // Mute known third-party warning from react-native-draggable-flatlist
  }
  originalConsoleError(...args);
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
