import { InputTransactionData, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useEffect, useState } from "react";

function MintingComponent() {
    const { account, signAndSubmitTransaction } = useWallet();
    const [currentStage, setCurrentStage] = useState<string>("PRESALE");
    const [price, setPrice] = useState<number>(1);
    const [amount, setAmount] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [maxAmount] = useState<number>(15);

    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

    const fetchMintingState = async () => {
        try {
            const resource = await aptos.getAccountResource({
                accountAddress: CONTRACT_ADDRESS,
                resourceType: `${CONTRACT_ADDRESS}::painted_pandaz_mint::CollectionConfig`,
            });
            console.log('RESOURCE: '+ resource)

            if (resource.data.current_stage === 0) {
                setCurrentStage("NOT LAUNCHED YET");
                setPrice(1000);
            } else if (resource.data.current_stage === 1) {
                setCurrentStage("WHITELIST");
                setPrice(0);
            } else if (resource.data.current_stage === 2) {
                setCurrentStage("EARLY BIRD");
                setPrice(1);
            } else {
                setCurrentStage("PUBLIC");
                setPrice(1.5);
            }
        } catch (error) {
            console.error("Error fetching minting state:", error);
        }
    };

    useEffect(() => {
        if (account) {
            fetchMintingState();
        }
    }, [account]);

    const decreaseAmount = () => {
        if (amount > 1) {
            setAmount(amount - 1);
        }
    };

    const increaseAmount = () => {
        if (amount < maxAmount) {
            setAmount(amount + 1);
        }
    };

    const mintNFT = async () => {
        if (!account) return;

        setIsLoading(true);
        try {
            const transaction: InputTransactionData = {
                data: {
                    function: `${CONTRACT_ADDRESS}::painted_pandaz_mint::bulk_mint`,
                    typeArguments: [],
                    functionArguments: [
                        false,
                        CONTRACT_ADDRESS,
                        amount
                    ]
                }
            };

            const response = await signAndSubmitTransaction(transaction);
            await aptos.waitForTransaction({ transactionHash: response.hash });
            
            console.log(`${amount} NFTs Minted Successfully!`);
            alert(`${amount} NFT${amount > 1 ? 's' : ''} minted successfully!`);
            
        } catch (error) {
            console.error("Error minting NFTs:", error);
            alert("Failed to mint NFTs. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="minting-card">
            {/* Stage */}
            <div className="mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Stage:</h3>
                <h2 className="text-xl font-bold uppercase">{currentStage}</h2>
            </div>
            
            {/* Price */}
            <div className="mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Price:</h3>
                <h2 className="text-xl font-bold">{price} APT {amount > 1 ? `(${price * amount} APT total)` : ''}</h2>
            </div>

            {/* Amount Selector */}
            <div className="mb-6">
                <h3 className="text-gray-400 text-sm font-medium">Amount:</h3>
                <div className="flex items-center justify-center mt-2">
                    <button 
                        onClick={decreaseAmount}
                        className="amount-btn"
                        disabled={amount <= 1}
                    >
                        -
                    </button>
                    <div className="w-20 text-center text-xl font-bold mx-4">
                        {amount}
                    </div>
                    <button 
                        onClick={increaseAmount}
                        className="amount-btn"
                        disabled={amount >= maxAmount}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Mint Button */}
            <button
                onClick={mintNFT}
                disabled={isLoading || !account || currentStage === "NOT LAUNCHED YET"}
                className="mint-btn uppercase"
            >
                {isLoading ? "MINTING..." : `MINT ${amount} NFT${amount > 1 ? 'S' : ''}`}
            </button>
        </div>
    );
}

export default MintingComponent;

