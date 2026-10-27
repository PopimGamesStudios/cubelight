/// <reference types="vite/client" />

import type { CubelightApi } from "@shared/types";

declare global {
  interface Window {
    cubelight?: CubelightApi;
  }
}

export {};
