import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { useAuthStore } from './store/authStore.js';

// Validate stored session token in background on every page load.
// App renders immediately using localStorage cache; init() silently
// clears it if the token has expired.
useAuthStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
