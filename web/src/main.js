import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { App } from './App';
const root = document.getElementById('root');
if (!root)
    throw new Error('Pakka needs a root element.');
createRoot(root).render(_jsx(StrictMode, { children: _jsx(MotionConfig, { reducedMotion: "user", children: _jsx(App, {}) }) }));
