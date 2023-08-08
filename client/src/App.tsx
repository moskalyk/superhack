import React from 'react';
import logo from './logo.svg';
import './App.css';
import { IDKitWidget, solidityEncode,ISuccessResult } from '@worldcoin/idkit'
import { sequence } from '0xsequence'

import { BigNumber } from 'ethers'
import { decode } from './decode'
import { ethers } from 'ethers'

let count = 0;
function App() {
  const [init, setInit] = React.useState<any>(false)
  const [price, setPrice] = React.useState<any>('-')
  const [address, setAddress] = React.useState<any>('-')
  const [claimView, setClaimView] = React.useState(false)
  const [bridgeView, setBridgeView] = React.useState(false)
  const [counts, setCounts] = React.useState(0);
  const [balance, setBalance] = React.useState(0);
  const [amountToBridge, setAmountToBridge] = React.useState(0)
  const [isLoggedIn, setIsLoggedIn] = React.useState<any>(false)
  const [isWorldCoinVerified, setIsWorldCoinVerified] = React.useState<any>(true)
  const [direction, setDirection] = React.useState<any>('→')

  sequence.initWallet({defaultNetwork: 'optimism'})

  React.useEffect(() => {
    if(!init){
      renderPrice()
      setInterval(() => {
        renderPrice()
      }, 10000)
      setInit(true)
    }
  }, [count]);

  const renderPrice = async () => {
    const res = await fetch('http://localhost:4000/quote')
    const json = await res.json()
    setPrice((100 + 5*(json.quote / 10**18)).toFixed(2))
    console.log(json)
  }

  const claim = () => {
    const interval = setInterval(() => {
      if (count < 200) {
        count++
        setCounts(prevCount => prevCount + 1);
      } else {
        clearInterval(interval);
      }
    }, 10);
  }

  const [proof, setProof] = React.useState<ISuccessResult | null>(null)

  const connect = async () => {
    const wallet = await sequence.getWallet()
    const details = await wallet.connect({app: 'Charm'})
    if(details.connected){
      console.log(details)
      setAddress(details.session?.accountAddress)

      // do contract check for the wallet nullifier
      setIsLoggedIn(true)
    }
  }

  const verifyProof = async () => {
    const wallet = await sequence.getWallet()
    console.log(proof)

    // your contract address
    const contractAddress = '0x'

     // Craft your transaction
     const erc20Interface = new ethers.utils.Interface([
      'function verify(address signal, uint256 root, uint256 nullifierHash, uint256[8] calldata proof) public'
    ])
  
    const data = erc20Interface.encodeFunctionData(
      'verify', [
        await wallet.getAddress(),
        proof?.merkle_root ? decode<BigNumber>('uint256', proof?.merkle_root ?? '') : BigNumber.from(0),
        proof?.nullifier_hash ? decode<BigNumber>('uint256', proof?.nullifier_hash ?? '') : BigNumber.from(0),
        proof?.proof
          ? decode<[BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber]>(
              'uint256[8]',
              proof?.proof ?? ''
            )
          : [
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
              BigNumber.from(0),
            ],
      ]
    )

    const txn = {
      to: contractAddress,
      data: data
    }

    const signer = wallet.getSigner()

    // const txRes = await signer.sendTransaction(txn1)
    console.log(txn)
  }
  
  const bridge = async () => {
    const wallet = await sequence.getWallet()
    // send transaction
    const contractAddress = '0x'

    const erc20Interface = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount) public returns (bool)'
    ]);

    const data = erc20Interface.encodeFunctionData('transfer', ['0x0000000000000000000000000000000000000000', (amountToBridge*10**18).toString()]);
    console.log(data)

    const signer = wallet.getSigner()

    const txn1 = {
      to: contractAddress,
      data
    }

    const txRes = await signer.sendTransaction(txn1)
    // send request to bridge and mint on otherchain

    const res = await fetch("http://localhost:8000/quote/bridge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ 
        address: address,
        amount: amountToBridge
      })
    })

  }

  return (
    <div className="App">
      {
        !isLoggedIn ? 
        <>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <span style={{fontSize: '20px'}}>{'⚭'}</span>
        <span>CHARM</span>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <button style={{fontFamily: 'Orbitron'}} onClick={() => connect()}>Sequence Login</button>
        </>
        :
        !isWorldCoinVerified 
        ?
        <>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <span style={{fontSize: '20px'}}>{'⚭'}</span>
          <span>CHARM</span>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <span>please verify with worldcoin</span>
          <br/>
          <br/>
          <br/>
          <IDKitWidget
                app_id="app_staging_55048f327711e732e3a962abef709a22" // must be an app set to on-chain
                action={solidityEncode(['uint256'], ["0"])} // solidityEncode the action
                signal={'0x'} // only for on-chain use cases, this is used to prevent tampering with a message
                onSuccess={setProof}
                // no use for handleVerify, so it is removed
                enableTelemetry
            >
                {({ open }) => <button style={{fontFamily: 'Orbitron'}} onClick={open}>Verify with World ID</button>}
          </IDKitWidget>
        </>
        : <>
        <div style={{position: 'fixed', top: '20px', right: '20px'}}>
          ⚭ {balance}
        </div>
        <br/>
        <br/>
        <br/>
        <span onClick={() => {setClaimView(true);setBridgeView(false)}} style={{textDecoration: claimView ? 'underline' : 'none'}}>collect</span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span onClick={() => {setClaimView(false);setBridgeView(false)}} style={{textDecoration: !claimView && !bridgeView ? 'underline' : 'none'}}>swap</span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span onClick={() => {setBridgeView(true);setClaimView(false)}} style={{textDecoration: bridgeView ? 'underline' : 'none'}}>bridge</span>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        {
          claimView ? 
          <>
            <span>{"⚭ "+count}</span>
            <br/>
            <br/>
            <br/>
            <button style={{fontFamily: 'Orbitron'}}onClick={() => claim()}>collect</button>
          </>
          :
          bridgeView ? 
          <>
            <span>{`${'100'}🔴 ⚭ ${price}`}🦉</span>
            <br/>
            <br/>
            <br/>
            <span style={{color: 'lightgrey'}}>please stay on this page till after bridge</span>
            <br/>
            <br/>
            <span>optimism</span>&nbsp;&nbsp;<span onClick={() => {setDirection('→' == direction ? '←' : "→" )}}>{direction}</span>&nbsp;&nbsp;<span>gnosis</span>
            <br/>
            <br/>
            <br/>
            <input placeholder='AMOUNT' style={{textAlign:'center', fontFamily: 'Orbitron'}} onChange={(evt: any) => {
              setAmountToBridge(evt.target.value)
            }}></input>
            <br/>
            <br/>
            <br/>
            <button style={{fontFamily: 'Orbitron'}} onClick={()=>{bridge()}}>bridge</button>
          </>
          :
          <>
            <span>{`${'USDC 1'} ⚭ ${(price * 23.56 / 100).toFixed(2)}`}</span>
            <br/>
            <br/>
            <br/>
            <br/>
            <div className="container">
              <div className="sideBySideDiv">
                <input placeholder='USDC' style={{textAlign:'center', fontFamily: 'Orbitron'}}></input>
              </div>
              <div className="sideBySideDiv">
                <input placeholder='CHARM' style={{textAlign:'center', fontFamily: 'Orbitron'}}></input>
              </div>
            </div>
            <button style={{fontFamily: 'Orbitron'}}>swap</button>
          </>
        }
      </>
    }
    </div>
  );
}

export default App;