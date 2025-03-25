import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";

function Header() {
    const { account, connected, disconnect, connect, wallets = [] } = useWallet();
    const [isConnecting, setIsConnecting] = useState(false);
    
    // Function to truncate address for display
    // const truncateAddress = (address: string) => {
    //     if (!address) return "";
    //     const prefix = address.substring(0, 6);
    //     const suffix = address.substring(address.length - 4);
    //     return `${prefix}...${suffix}`;
    // };

    // Connect directly to Petra wallet
    const connectPetra = async () => {
        const petraWallet = wallets.find(wallet => wallet.name === "Petra");
        if (petraWallet) {
            try {
                setIsConnecting(true);
                await connect(petraWallet.name);
            } catch (error) {
                console.error("Failed to connect to Petra wallet:", error);
                alert("Failed to connect to Petra wallet. Please make sure it's installed and unlocked.");
            } finally {
                setIsConnecting(false);
            }
        } else {
            window.open("https://petra.app/", "_blank");
            alert("Please install the Petra wallet extension and refresh the page.");
        }
    };

    return (
        <header className="header">
            <div className="logo-container">
                <img 
                    src="/Painted_Pandaz_logo_black.png" 
                    alt="Painted Pandaz" 
                    className="logo"
                />
            </div>
            
            {connected && account ? (
                <div className="wallet-info">
                    <button 
                        className="connect-btn" 
                        onClick={disconnect}
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <div className="wallet-info">
                    <button 
                        className="connect-btn" 
                        onClick={connectPetra}
                        disabled={isConnecting}
                    >
                        {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;
