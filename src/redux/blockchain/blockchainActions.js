// constants
import Web3EthContract from "web3-eth-contract";
import Web3 from "web3";
// log
import { fetchData } from "../data/dataActions";


// NOTES
// to connect to the wallet:       window.ethereum.request({method: "eth_requestAccounts"})
// to get address once connected:  window.ethereum.request({method: "eth_accounts"})

const connectRequest = () => {
  return {
    type: "CONNECTION_REQUEST",
  };
};

const connectSuccess = (payload) => {
  return {
    type: "CONNECTION_SUCCESS",
    payload: payload,
  };
};

const connectFailed = (payload) => {
  return {
    type: "CONNECTION_FAILED",
    payload: payload,
  };
};

const updateAccountRequest = (payload) => {
  return {
    type: "UPDATE_ACCOUNT",
    payload: payload,
  };
};

export const connect = () => {

  return async (dispatch) => {

    dispatch(connectRequest());

    // Get the ABI config from the JSON file.
    const abiResponse = await fetch("/config/abi.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const abi = await abiResponse.json();

    // Get the whole application config.
    const configResponse = await fetch("/config/config.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const CONFIG = await configResponse.json();

    // Window is part of the Web3 API and is injected by the wallet
    // extension (metamask for eth) into any web page.
    const { ethereum } = window;
    const metamaskIsInstalled = ethereum && ethereum.isMetaMask;

    if (metamaskIsInstalled) {

      // Set the provider for the eth contract
      // eg: Metamask will be a proxy provider for ethereum
      Web3EthContract.setProvider(ethereum);

      // Create a new instance of web3 with the eth network as provider.
      let web3 = new Web3(ethereum);

      try {
        
        // Connect metamask and get accounts array
        // TODO: use link.setUp();
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        
        // Gets eth version:
        // 1 == ethereum main net
        // 3 == robsten test net
        const networkId = await ethereum.request({
          method: "net_version",
        });

        // Ensure the network the wallet it connected to is
        // the same that this application requires
        if (networkId == CONFIG.NETWORK.ID) {
          
          // Create an instance of the web3 equivalent of
          // our NFT smart contract.
          const SmartContractObj = new Web3EthContract(
            abi,
            CONFIG.CONTRACT_ADDRESS
          );

          // Create the Redux type-payload call
          // to the update the state.
          const connectTypePayload = connectSuccess({
            account: accounts[0], // connected wallet account
            smartContract: SmartContractObj, // NFT contract object
            web3: web3,
          });

          // Trigger a state change in Redux
          // To add the account and smart contract to the state
          // this way the main app can the call other methods
          // that rely on this (eg: NFTs count, minting etc.)
          dispatch(connectTypePayload);


          // START -- Add listeners to wallet -- 
          //////////////////////////////////////

          // If the user changes the account from Metamask, update the address.
          ethereum.on("accountsChanged", (accounts) => {
            console.log('User changed the account')
            dispatch(updateAccount(accounts[0]));
          });

          // Reload the page if the chain is changes in the wallet
          ethereum.on("chainChanged", () => {
            window.location.reload();
          });
          
          // END -- Add listeners to wallet --
          ////////////////////////////////////
        } 
        // Network is not the same as what the app requires
        else {
          dispatch(connectFailed(`Change network to ${CONFIG.NETWORK.NAME}.`));
        }

      } catch (err) {
        dispatch(connectFailed("Something went wrong."));
      }
    } else {
      dispatch(connectFailed("Install Metamask."));
    }
  };
};

export const updateAccount = (account) => {
  return async (dispatch) => {
    dispatch(updateAccountRequest({ account: account }));
    dispatch(fetchData(account));
  };
};
