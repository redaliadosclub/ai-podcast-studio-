import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LowPowerProvider } from './contexts/LowPowerContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <LowPowerProvider>
    <App />
  </LowPowerProvider>
);

