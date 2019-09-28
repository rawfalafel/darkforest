function startApp() {
    var darkForestAddress = "YOUR_CONTRACT_ADDRESS";
    darkForest = new web3js.eth.Contract(darkForestABI, darkForestAddress);

    var accountInterval = setInterval(function() {
        // Check if account has changed
        if (web3.eth.accounts[0] !== userAccount) {
            userAccount = web3.eth.accounts[0];
            // Call a function to update the UI with the new account
            // TODO
        }
    }, 100);
}

window.addEventListener('load', function() {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        // Use Mist/MetaMask's provider
        web3js = new Web3(web3.currentProvider);
    } else {
        // Handle the case where the user doesn't have Metamask installed
        // Probably show them a message prompting them to install Metamask
        alert('Please install Metamask to play this game!');
    }

    // Now you can start your app & access web3 freely:
    startApp()
})
