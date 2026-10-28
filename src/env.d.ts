/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** The tool's own HERE API key, set at build time; see README */
  readonly VITE_HERE_API_KEY?: string;
}
