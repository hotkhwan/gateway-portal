// src/app.d.ts
/// <reference types="@sveltejs/kit" />
/// <reference types="vite/client" />

declare global {
  namespace App {
    interface Locals {
      user: null | {
        sub: string
        email?: string
        name?: string
        roles: string[]
        permissions?: string[]
        accessToken?: string
      }
    }
  }

  namespace SvelteKit {
    interface Platform {}
  }

  interface ImportMetaEnv {
    readonly PUBLIC_APP_BASE_PATH?: string
    readonly PUBLIC_APP_BASE_PORT?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export { }
