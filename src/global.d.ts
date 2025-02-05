export {};
declare global {
  interface Window {
    androidBackCallback?: () => void;
  }
}
