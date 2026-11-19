import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from './auth';
import {PlayerController} from './player';
import {App} from './App';
import './styles.css';
import './soundcloud.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><AuthProvider><PlayerController/><App/></AuthProvider></BrowserRouter></React.StrictMode>);
