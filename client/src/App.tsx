import React from 'react';
import logo from './logo.svg';
import './App.css';
import { IDKitWidget, solidityEncode,ISuccessResult } from '@worldcoin/idkit'
import { sequence } from '0xsequence'

import { BigNumber } from 'ethers'
import { decode } from './decode'
import { ethers } from 'ethers'

import { SequenceIndexerClient } from '@0xsequence/indexer'
import { useTheme, Spinner, Box} from '@0xsequence/design-system'

let count = 0;
let addressGlobal: any = null;
const indexer = new SequenceIndexerClient('https://optimism-indexer.sequence.app')
const indexerBase = new SequenceIndexerClient('https://base-goerli-indexer.sequence.app')

function App() {
  const [init, setInit] = React.useState<any>(false)
  const [price, setPrice] = React.useState<any>('-')
  const [address, setAddress] = React.useState<any>('-')
  const [claimView, setClaimView] = React.useState(false)
  const [bridgeView, setBridgeView] = React.useState(false)
  const [success, setSuccess] = React.useState(false);
  const [counts, setCounts] = React.useState(0);
  const [balance, setBalance] = React.useState(0);
  const [baseBalance, setBaseBalance] = React.useState(0);
  const [amountToBridge, setAmountToBridge] = React.useState<any>(0)
  const [bridgeAmount, setBridgeAmount] = React.useState<any>(0)

  const [isLoggedIn, setIsLoggedIn] = React.useState<any>(false)
  const [isWorldCoinVerified, setIsWorldCoinVerified] = React.useState<any>(true)
  const [direction, setDirection] = React.useState<any>('→')
  const {theme, setTheme} = useTheme()
  sequence.initWallet({defaultNetwork: 'optimism'})
  React.useEffect(() => {
    if(!init){
      renderPrice()
      setTheme('light')
      setInterval(() => {
        renderPrice()
      }, 10000)
      setInit(true)
    }
  }, [count, address]);

  React.useEffect(() => {
    if(address!='-') getBalance()
  }, [address])

  const renderPrice = async () => {
    const res = await fetch('http://localhost:4000/quote')
    const json = await res.json()
    setPrice((100 + 5*(json.quote / 10**18)).toFixed(2))
    console.log(json)
  }

  const collect = async () => {
    const wallet = await sequence.getWallet()

    const contractAddress = '0x64FAB353dbdb239D4EEeE3D50bBCF87F3adbB4AD'

    // Craft your transaction
    const erc20Interface = new ethers.utils.Interface([
      'function collect(address _recipient) external'
    ])

    const data = erc20Interface.encodeFunctionData(
      'collect', [await wallet.getAddress()]
    )

    const tx = {
      to: contractAddress,
      data
    }

    const signer = await wallet.getSigner()
    const res = await signer.sendTransaction(tx)
    let amount: any;

    const filter = {
      accountAddress: await wallet.getAddress()
    }

    setTimeout(async () => {
      // query Sequence Indexer for all token transaction history on Polygon
      const transactionHistory = await indexer.getTransactionHistory({
          filter: filter,
          includeMetadata: true
      })

      for(let i = 0; i < transactionHistory.transactions.length; i++){
        transactionHistory.transactions[i].transfers?.map((transfer: any) => {
          amount = transfer.amounts[0]
        })
        break;
      }
      getBalance()

      const interval = setInterval(async () => {
        if (count < Number(amount)) {
          count++
          setCounts(prevCount => prevCount + 1);
        } else {
          clearInterval(interval);
        }
      }, 10);
    }, 1000)
  }

  const [proof, setProof] = React.useState<ISuccessResult | null>(null)

  const connect = async () => {
    const wallet = await sequence.getWallet()
    const details = await wallet.connect({app: 'Charm'})
    if(details.connected){
      console.log(details)
      setAddress(details.session?.accountAddress)
      addressGlobal = details.session?.accountAddress
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
    setSuccess(true)

    const wallet = await sequence.getWallet()
    const contractAddress = '0x64fab353dbdb239d4eeee3d50bbcf87f3adbb4ad'
    let chainId = 10
    if('→' != direction){
      chainId = 84531
    }
    // send transaction
    const erc20Interface = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount) public returns (bool)'
    ]);

    const data = erc20Interface.encodeFunctionData('transfer', [contractAddress, (amountToBridge).toString()]);
    console.log(data)

    const signer = wallet.getSigner(chainId)

    const txn1 = {
      to: contractAddress,
      data
    }

    const txRes = await signer.sendTransaction(txn1)
    // send request to bridge and mint on otherchain

    const res = await fetch("http://localhost:4000/quote/bridge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ 
        address: address,
        amount: amountToBridge,
        direction: direction
      })
    })

    const json = await res.json()
    console.log(json.amount)
    setBridgeAmount(json.amount)
    getBalance()
    setSuccess(false)
  }

  const getBalance = async () => {
    // try any account address you'd like :)
    const accountAddress = address
    console.log(address)

    // query Sequence Indexer for all token balances of the account on Polygon
    const tokenBalances = await indexer.getTokenBalances({
        accountAddress: accountAddress,
    })
    
    tokenBalances.balances.map((balance: any ) => {
      if(balance.contractAddress == '0x64fab353dbdb239d4eeee3d50bbcf87f3adbb4ad')
        setBalance(balance.balance)
    })

    // query Sequence Indexer for all token balances of the account on Polygon
    const tokenBalances2 = await indexerBase.getTokenBalances({
      accountAddress: accountAddress,
    })
    
    tokenBalances2.balances.map((balance: any ) => {
      if(balance.contractAddress == '0x64fab353dbdb239d4eeee3d50bbcf87f3adbb4ad')
        setBaseBalance(balance.balance)
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
        <span>a neuro-enabled blockcoin</span>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <br/>
        <button style={{fontFamily: 'Orbitron'}} onClick={() => connect()}>Login</button>
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
          ⚭ {balance} <img width={13} src='https://sequence.app/static/images/10.81166c8789577f8a7309.png'></img>
          <br/>
          ⚭ {baseBalance} <img width={13} src='https://sequence.app/static/images/8453.86db40991c374a30ce21.png'></img>
        </div>
        <br/>
        <br/>
        <br/>
        <span onClick={() => {setClaimView(true);setBridgeView(false);setTheme('light');}} style={{textDecoration: claimView ? 'underline' : 'none'}}>collect</span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span onClick={() => {setClaimView(false);setBridgeView(false);setTheme('light');}} style={{textDecoration: !claimView && !bridgeView ? 'underline' : 'none'}}>swap</span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span onClick={() => {setBridgeView(true);setClaimView(false); setTheme('dark');setDirection('→');}} style={{textDecoration: bridgeView ? 'underline' : 'none'}}>bridge</span>
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
            <button style={{fontFamily: 'Orbitron'}}onClick={() => collect()}>collect</button>
          </>
          :
          bridgeView ? 
          <>
            <span>{`${'100'}🔴 ⚭ ${price}`}🟡</span>
            <br/>
            <br/>
            <br/>
            <span style={{color: 'lightgrey'}}>please stay on this page till after bridge</span>
            <br/>
            <br/>
            <span>optimism</span>&nbsp;&nbsp;<span onClick={() => {setBridgeAmount(null);setTheme(theme == 'light' ? 'dark' : 'light');setDirection('→' == direction ? '←' : "→" )}}>{direction}</span>&nbsp;&nbsp;<span>base-goerli</span>
            <br/>
            <br/>
            <br/>
            <input placeholder='AMOUNT' style={{textAlign:'center', fontFamily: 'Orbitron'}} onChange={(evt: any) => {
              setAmountToBridge(evt.target.value)
            }}></input>
            <br/>
            <br/>
            <Box alignItems="center" marginY="0">
              <p style={{textAlign: 'center', margin: 'auto'}}>{success ? <Spinner /> : !bridgeAmount ? <button style={{fontFamily: 'Orbitron', color: 'black'}} onClick={()=>{bridge()}}>bridge</button> : <span>{"⚭ "+bridgeAmount.toFixed(2)}</span>}</p>
            </Box>
          
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