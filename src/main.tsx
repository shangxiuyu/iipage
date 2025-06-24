import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 占位：分享白板页面组件，后续实现
const ShareBoardPage = React.lazy(() => import('./components/ShareBoardPage'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/share/:shareId" element={
          <React.Suspense fallback={<div>加载中...</div>}>
            <ShareBoardPage />
          </React.Suspense>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
