import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DappProvider } from '@multiversx/sdk-dapp/wrappers/DappProvider'
import { NotificationModal } from '@multiversx/sdk-dapp/UI/NotificationModal'
import { SignTransactionsModals } from '@multiversx/sdk-dapp/UI/SignTransactionsModals'
import { TransactionsToastList } from '@multiversx/sdk-dapp/UI/TransactionsToastList'
import App from './App.tsx'
import './index.css'

const walletConnectV2ProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '9b1a9564f91cb659ffe21b73d5c4e2d8'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DappProvider
        environment="devnet"
        customNetworkConfig={{
          name: 'devnet',
          apiTimeout: 10000,
          walletConnectV2ProjectId
        }}
      >
        <App />
        <NotificationModal />
        <SignTransactionsModals />
        <TransactionsToastList />
      </DappProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
