import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './landing/Landing';
import './landing/landing.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
