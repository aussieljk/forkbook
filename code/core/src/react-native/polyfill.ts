// A workaround for setImmediate not being defined on the web. It does nothing when it is defined.
// Upstream also polyfilled URLSearchParams with react-native-url-polyfill. Expo has its own URL
// polyfill, and Forkbook supports only Expo on iOS, so that polyfill is not here.
import 'setimmediate';
