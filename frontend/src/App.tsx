import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import Layout from './components/Layout';
import './styles/App.css';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyle } from './styles/global';

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <BrowserRouter>
        <DemoProvider>
          <Layout />
        </DemoProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App; 