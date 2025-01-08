import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AgoraRTCProvider } from 'agora-rtc-react';
// Create Agora RTC client
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  
    <AgoraRTCProvider client={client}>
      <App />
    </AgoraRTCProvider>
 
);