import './App.css'
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import Header from './components/header';
import MintingOverlay from './components/MintingOverlay';

// Initialize wallet adapters
const wallets = [new PetraWallet()];

function App() {
    return (
        <AptosWalletAdapterProvider plugins={wallets} autoConnect={true} onError={(error) => console.error("Wallet adapter error:", error)}>
            <div className="app-container">
                <div className="white-ball-bg"></div>
                <div className="panda-bg"></div>
                <Header />
                <MintingOverlay />
            </div>
        </AptosWalletAdapterProvider>
    );
}

export default App
