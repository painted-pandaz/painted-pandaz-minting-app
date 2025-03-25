import {ethers} from 'ethers';

// Declare ethereum type on window
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Contract ABI for the NFT minting functions
export const PAINTED_PANDAZ_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentStage",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxMintPerWallet",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with your actual contract address

// Network configuration for Cronos
export const CRONOS_NETWORK = {
  chainId: "0x19", // Cronos Mainnet chainId in hex
  chainName: "Cronos Mainnet",
  nativeCurrency: {
    name: "CRO",
    symbol: "CRO",
    decimals: 18,
  },
  rpcUrls: ["https://evm.cronos.org"],
  blockExplorerUrls: ["https://cronoscan.com/"],
};

// Connect to provider
export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get signer
export const getSigner = async () => {
  const provider = getProvider();
  if (!provider) return null;
  return await provider.getSigner();
};

// Get contract
export const getContract = async () => {
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(CONTRACT_ADDRESS, PAINTED_PANDAZ_ABI, signer);
};

// Connect wallet
export const connectWallet = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask or another Web3 wallet");
    return null;
  }
  
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    
    // Check if current network is Cronos, if not, prompt to switch
    await switchToCronosNetwork();
    
    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    return null;
  }
};

// Switch to Cronos network
export const switchToCronosNetwork = async () => {
  if (!window.ethereum) return;
  
  try {
    // Try to switch to the Cronos network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CRONOS_NETWORK.chainId }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CRONOS_NETWORK],
        });
      } catch (addError) {
        console.error("Error adding Cronos network:", addError);
      }
    } else {
      console.error("Error switching to Cronos network:", switchError);
    }
  }
};

// Get current stage
export const getCurrentStage = async () => {
  try {
    const contract = await getContract();
    if (!contract) return 0;

    return await contract.currentStage();
  } catch (error) {
    console.error("Error getting current stage:", error);
    return 0;
  }
};

// Get price
export const getPrice = async () => {
  try {
    const contract = await getContract();
    if (!contract) return 0;

    return await contract.price();
  } catch (error) {
    console.error("Error getting price:", error);
    return 0;
  }
};

// Get max mint per wallet
export const getMaxMintPerWallet = async () => {
  try {
    const contract = await getContract();
    if (!contract) return 10; // Default value

    return await contract.maxMintPerWallet();
  } catch (error) {
    console.error("Error getting max mint per wallet:", error);
    return 10; // Default value
  }
};

// Mint NFTs
export const mintNFTs = async (amount: number) => {
  try {
    const contract = await getContract();
    if (!contract) throw new Error("Contract not available");
    
    const price = await getPrice();
    const totalPrice = price * BigInt(amount);
    
    const transaction = await contract.mint(amount, { value: totalPrice });
    await transaction.wait();
    
    return transaction.hash;
  } catch (error) {
    console.error("Error minting NFTs:", error);
    throw error;
  }
}; 
