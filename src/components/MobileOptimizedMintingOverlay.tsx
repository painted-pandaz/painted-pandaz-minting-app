import { useState, useEffect } from "react";
import { InputTransactionData, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

interface CollectionConfigData {
    current_stage?: number;
    stage_1_minted?: number | string;
    stage_2_minted?: number | string;
    stage_2_price?: number | string;
    public_price?: number | string;
    total_minted?: number | string;
    paused?: boolean;
    base_uri?: string;
    collection_name?: string;
    collection_description?: string;
    collection_uri?: string;
    owner?: string;
    stage_1_whitelist?: string[];
    stage_2_whitelist?: string[];
    stage_1_free_mint_used?: string[];
    stage_1_mints_per_address?: string[];
    stage_1_mints_count?: number[] | string[];
    auto_stage_transition?: boolean;
}

function MobileOptimizedMintingOverlay() {
    const { account, connected, signAndSubmitTransaction } = useWallet();
    const [currentStage, setCurrentStage] = useState<string>("WHITELIST");
    const [price, setPrice] = useState<number>(1); // Default price in APT
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractVerified, setContractVerified] = useState(false);
    const [totalMinted, setTotalMinted] = useState<number>(0);
    const [isWhitelisted, setIsWhitelisted] = useState(false);
    const [hasUsedFreeMint, setHasUsedFreeMint] = useState(false);
    const [userMintCount, setUserMintCount] = useState(0);
    const [quantity, setQuantity] = useState<number>(1);
    const maxQuantity = 15;
    const [isMobile, setIsMobile] = useState(false);
    const [isProjectWallet, setIsProjectWallet] = useState(false);
    
    const PROJECT_WALLET = import.meta.env.VITE_PROJECT_WALLET;
    const MAX_WHITELIST_MINTS = 20;
    const MAX_MINT_PER_TX = 15;

    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
    
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth <= 480);
        };
        
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        
        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    // Check if connected wallet is project wallet
    useEffect(() => {
        if (connected && account) {
            setIsProjectWallet(account.address === PROJECT_WALLET);
        } else {
            setIsProjectWallet(false);
        }
    }, [account, connected]);

    const verifyContractExists = async () => {
        try {

            const modules = await aptos.getAccountModules({ accountAddress: CONTRACT_ADDRESS });

            const paintedPandazModule = modules.find(
                (module) => module.abi?.name === "painted_pandaz_mint"
            );
            
            if (paintedPandazModule) {
                setContractVerified(true);
                return true;
            } else {
                console.error("painted_pandaz_mint module not found at the specified address");
                setContractVerified(false);
                setError("Contract module not found. Please check the contract address.");
                return false;
            }
        } catch (error) {
            console.error("Error verifying contract:", error);
            setContractVerified(false);
            setError("Failed to verify contract. Please check the contract address.");
            return false;
        }
    };

    const checkIfWhitelisted = (data: CollectionConfigData) => {
        if (!account) return false;
        
        // Project wallet is always considered whitelisted
        if (account.address === PROJECT_WALLET) {
            return true;
        }
        
        if (data.stage_1_whitelist && data.stage_1_whitelist.includes(account.address)) {
            return true;
        }
        
        return !!(data.stage_2_whitelist && data.stage_2_whitelist.includes(account.address));
    };

    const checkFreeMintStatus = (data: CollectionConfigData) => {
        if (!account) return false;
        
        // Project wallet always has free mint available during whitelist
        if (account.address === PROJECT_WALLET) {
            return false;
        }

        if (data.stage_1_free_mint_used && data.stage_1_free_mint_used.includes(account.address)) {
            return true;
        }
        
        return false;
    };

    const getUserMintCount = (data: CollectionConfigData) => {
        if (!account) return 0;
        

        if (data.stage_1_mints_per_address && data.stage_1_mints_count &&
            data.stage_1_mints_per_address.length === data.stage_1_mints_count.length) {
            
            const index = data.stage_1_mints_per_address.findIndex(addr => addr === account.address);
            if (index !== -1) {
                const count = Number(data.stage_1_mints_count[index]);
                return count;
            }
        }
        
        return 0;
    };

    const fetchMintingState = async () => {
        if (!connected || !account) return;
        
        try {
            setError(null);
            
            const verified = await verifyContractExists();
            if (!verified) {
                return;
            }
            

            const allResources = await aptos.getAccountResources({
                accountAddress: CONTRACT_ADDRESS
            });
            

            const collectionConfigResource = allResources.find(
                (resource) => resource.type.includes("::painted_pandaz_mint::CollectionConfig")
            );
            
            if (!collectionConfigResource) {
                throw new Error("CollectionConfig resource not found");
            }
            

            const data = collectionConfigResource.data as CollectionConfigData;

            const whitelist = checkIfWhitelisted(data);
            setIsWhitelisted(whitelist);

            const usedFreeMint = checkFreeMintStatus(data);
            setHasUsedFreeMint(usedFreeMint);

            // Get user mint count
            const mintCount = getUserMintCount(data);
            setUserMintCount(mintCount);

            // Update state with the contract data
            if (data.current_stage !== undefined) {
                const stageValue = Number(data.current_stage);
                
                if (stageValue === 0) {
                    setCurrentStage("NOT LAUNCHED YET");
                    setPrice(1000);
                } else if (stageValue === 1) {
                    setCurrentStage("WHITELIST");
                    setPrice(0);
                } else if (stageValue === 2) {
                    setCurrentStage("EARLY BIRD");
                    setPrice(1);
                } else {
                    setCurrentStage("PUBLIC");
                    setPrice(1.5);
                }
            } else {
                // Default to PUBLIC if stage not found
                setCurrentStage("PUBLIC");
                setPrice(1.5);
            }
            
            // Update total minted
            if (data.total_minted !== undefined) {
                setTotalMinted(Number(data.total_minted));
            }
            
            setContractVerified(true);
            
        } catch (error) {
            console.error("Error fetching minting state:", error);
            setError("Failed to fetch minting state. Check console for details.");
            // Set default values in case of error
            setCurrentStage("PUBLIC");
            setPrice(1.5); // Default to 1.5 APT for public sale
        }
    };

    useEffect(() => {
        fetchMintingState();
    }, [account, connected]);

    // Add quantity adjustment functions
    const decreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const increaseQuantity = () => {
        // Use the MAX_MINT_PER_TX constant from the contract
        if (quantity < maxQuantity) {
            setQuantity(quantity + 1);
        }
    };

    // Use bulk mint function instead of individual mints
    const mintBulkNFTs = async () => {
        try {
            // The bulk_mint function expects four parameters:
            // 1. account (handled by the wallet adapter)
            // 2. is_free_mint (boolean) - true for free mint in stage 1
            // 3. owner_addr (address) - the contract address
            // 4. amount (u64) - number of NFTs to mint
            
            // Special case for project wallet during whitelist - always free
            const isFreeForProjectWallet = isProjectWallet && currentStage === "WHITELIST";
            
            const transaction: InputTransactionData = {
                data: {
                    function: `${CONTRACT_ADDRESS}::painted_pandaz_mint::bulk_mint`,
                    typeArguments: [],
                    functionArguments: [
                        isFreeForProjectWallet || (currentStage === "WHITELIST" && quantity === 1 && !hasUsedFreeMint),
                        CONTRACT_ADDRESS,
                        quantity
                    ]
                }
            };

            const response = await signAndSubmitTransaction(transaction);
            await aptos.waitForTransaction({ transactionHash: response.hash });
            
            console.log(`${quantity} NFTs Minted Successfully!`);
            return true;
        } catch (error) {
            console.error("Error minting NFTs:", error);
            throw error;
        }
    };

    const mintNFT = async () => {
        if (!connected || !account) {
            setError("Please connect your wallet first.");
            return;
        }

        if (!contractVerified) {
            setError("Contract not verified. Please check the contract address.");
            return;
        }

        // Check if user is whitelisted for the current stage
        if (currentStage === "WHITELIST" && !isWhitelisted && !isProjectWallet) {
            setError("You are not whitelisted for this stage");
            return;
        }
        
        // Check if user is trying to mint more than one NFT with free mint
        // Project wallet can mint multiple NFTs for free during whitelist
        // Only apply this restriction if the user has not used their free mint yet
        if (currentStage === "WHITELIST" && quantity > 1 && !isProjectWallet && !hasUsedFreeMint) {
            setError("You can only mint one NFT for free. Please adjust your quantity to 1.");
            return;
        }
        
        // Check if the user has reached the max mints for the whitelist
        // Skip this check for project wallet
        if (currentStage === "WHITELIST" && !isProjectWallet && userMintCount + quantity > MAX_WHITELIST_MINTS) {
            setError(`You can only mint ${MAX_WHITELIST_MINTS - userMintCount} more NFTs in this stage`);
            return;
        }

        // Ensure we don't exceed the MAX_MINT_PER_TX limit
        if (quantity > MAX_MINT_PER_TX) {
            setError(`Maximum ${MAX_MINT_PER_TX} NFTs can be minted in a single transaction`);
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            // Special case for project wallet - can always mint for free during whitelist
            if (isProjectWallet && currentStage === "WHITELIST") {
                await mintBulkNFTs();
                setUserMintCount(prevCount => prevCount + quantity);
            }
            // For free mints in presale, we can only use a single free mint
            // So if quantity > 1 and free mint is available, we need to handle this specially
            else if (currentStage === "WHITELIST" && !hasUsedFreeMint && quantity > 1) {
                // First mint a single free NFT
                await mintBulkNFTs(); // Use the free mint for 1 NFT
                setHasUsedFreeMint(true);
                
                // Then mint the rest as paid NFTs (quantity-1)
                if (quantity > 1) {
                    // Use regular mint for the remaining tokens
                    const remainingQuantity = quantity - 1;
                    
                    // Temporarily set quantity to the remaining amount
                    setQuantity(remainingQuantity);
                    await mintBulkNFTs(); // Paid mint for remaining NFTs
                    // Restore the original quantity
                    setQuantity(quantity);
                }
                
                setUserMintCount(prevCount => prevCount + quantity);
            } else {
                // Normal case - either all paid mints or a single free mint
                const isFree = currentStage === "WHITELIST" && !hasUsedFreeMint && quantity === 1;
                
                await mintBulkNFTs();
                
                if (isFree) {
                    setHasUsedFreeMint(true);
                }
                
                setUserMintCount(prevCount => prevCount + quantity);
            }
            
            alert(`Successfully minted ${quantity} NFT${quantity > 1 ? 's' : ''}!`);
            // Refresh the minting state after successful mint
            fetchMintingState();
            
        } catch (error) {
            console.error("Error minting NFTs:", error);
            setError(error instanceof Error ? error.message : "Unknown error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate the total price based on quantity and stage
    const calculateTotalPrice = () => {
        // Project wallet mints for free during whitelist
        if (isProjectWallet && currentStage === "WHITELIST") {
            return 0;
        }
        
        if (currentStage === "WHITELIST") {
            // In WHITELIST stage, first mint is free (if not used), rest are 1 APT
            if (!hasUsedFreeMint && quantity > 0) {
                return Math.max(0, quantity - 1); // One free, rest at 1 APT
            } else {
                return quantity; // All at 1 APT
            }
        } else if (currentStage === "EARLY BIRD") {
            return quantity * price;
        } else {
            return quantity * price;
        }
    };

    // Simplified rendering for mobile
    return (
        <div className={`minting-overlay ${isMobile ? 'mobile-view' : ''}`}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="mint-section">
                <div className="mint-label">Stage:</div>
                <div className="mint-value">{currentStage}</div>
            </div>
            
            <div className="mint-section">
                <div className="mint-label">Minted:</div>
                <div className="mint-value">{totalMinted} / 3333</div>
            </div>
            
            {/* Show project wallet status on desktop */}
            {isProjectWallet && !isMobile && currentStage === "WHITELIST" && (
                <div className="mint-section">
                    <div className="mint-label">Status:</div>
                    <div className="mint-value">Project Wallet (Free Mint)</div>
                </div>
            )}
            
            {/* Only show these sections on desktop and for non-project wallets */}
            {(currentStage === "WHITELIST") && !isMobile && !isProjectWallet && (
                <div className="mint-section">
                    <div className="mint-label">Whitelist Status:</div>
                    <div className="mint-value">
                        {isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
                    </div>
                </div>
            )}
            
            {isWhitelisted && !isMobile && !isProjectWallet && (
                <div className="mint-section">
                    <div className="mint-label">Your Mints:</div>
                    <div className="mint-value">{userMintCount} / {MAX_WHITELIST_MINTS}</div>
                </div>
            )}
            
            {currentStage === "WHITELIST" && isWhitelisted && !isMobile && !isProjectWallet && (
                <div className="mint-section">
                    <div className="mint-label">Free Mint:</div>
                    <div className="mint-value">
                        {hasUsedFreeMint ? "Used" : "Available"}
                    </div>
                </div>
            )}

            <div className="mint-section">
                <div className="mint-label">Quantity:</div>
                <div className="amount-selector">
                    <button className="amount-btn" onClick={decreaseQuantity}>-</button>
                    <span className="amount-value">{quantity}</span>
                    <button className="amount-btn" onClick={increaseQuantity}>+</button>
                </div>
            </div>
            
            <div className="mint-section">
                <div className="mint-label">Total Cost:</div>
                <div className="mint-value">{calculateTotalPrice()} APT</div>
            </div>
            
            <button 
                className="mint-btn" 
                onClick={mintNFT}
                disabled={
                    isLoading || 
                    !connected || 
                    !account || 
                    !contractVerified || 
                    (currentStage === "WHITELIST" && !isWhitelisted && !isProjectWallet) ||
                    (currentStage === "WHITELIST" && !isProjectWallet && userMintCount >= MAX_WHITELIST_MINTS) ||
                    currentStage === "NOT LAUNCHED YET"
                }
            >
                {isLoading ? "MINTING..." : `MINT ${quantity} NFT${quantity > 1 ? 's' : ''}`}
            </button>
            
            {!connected && <div className="wallet-notice">Connect your wallet to mint</div>}
        </div>
    );
}

export default MobileOptimizedMintingOverlay; 
