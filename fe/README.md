# Frontend 개발 가이드

## 1) 개발 환경 및 도구
- **Node.js**: `24.13.0` (권장)
- **npm**: `11.6.2` (권장)
- **버전 관리**: `nvm` 또는 `fnm` 사용을 권장합니다.
- **버전 확인**: `node -v` / `npm -v`

## 2) 브랜치 및 작업 규칙
- **브랜치 전략**: `feat/fe/*` 형식을 사용합니다.
- **Push 규칙**: `dev` 브랜치에 직접 Push하지 마세요. 모든 작업은 PR(Pull Request)을 통해 `dev` 브랜치로 병합(Merge)되어야 합니다.

## 3) 개발 가이드라인
- **패키지 설치**: `package-lock.json`을 기준으로 설치합니다.
  ```bash
  npm install
  ```
- **실행**:
  ```bash
  npm run dev
  ```
- **빌드**:
  ```bash
  npm run build
  ```

## 4) 주요 라이브러리 버전
- React: `^19.2.0`
- Three.js: `@react-three/fiber ^9.5.0`, `@react-three/drei ^10.7.7`, `three ^0.168.0`
- API 통신: `axios ^1.13.6`
- 상태 관리: `zustand ^5.0.11`
- 라우팅: `react-router-dom ^7.13.1`
- 스타일링: `tailwindcss ^3.4.17`, `autoprefixer ^10.4.27`, `postcss ^8.5.8`
- 빌드/린트: `vite ^7.3.1`, `typescript ~5.9.3`, `eslint ^9.39.1`

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
