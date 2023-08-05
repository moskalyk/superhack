import React from 'react';
import logo from './logo.svg';
import './App.css';
import { IDKitWidget, solidityEncode } from '@worldcoin/idkit'

let count = 0;

function App() {
  const [price, setPrice] = React.useState<any>('-')
  const [claimView, setClaimView] = React.useState(false)
  const [counts, setCounts] = React.useState(0);

  React.useEffect(() => {
    renderPrice()
    setInterval(() => {
      renderPrice()
    }, 20000)
  }, [count]);

  const renderPrice = async () => {
    const res = await fetch('http://localhost:4000/quote')
    const json = await res.json()
    setPrice(100 + 5*(json.quote / 100))
  }

  const claim = () => {
    const interval = setInterval(() => {
      if (count < 200) {
        count++
        // console.log()
        setCounts(prevCount => prevCount + 1);
      } else {
        clearInterval(interval);
      }
    }, 10);
  }

  return (
    <div className="App">
     <IDKitWidget
        app_id="app_staging_55048f327711e732e3a962abef709a22" // must be an app set to on-chain
        action={solidityEncode(['uint256'], ["0"])} // solidityEncode the action
        signal={'0x'} // only for on-chain use cases, this is used to prevent tampering with a message
        onSuccess={(res: any) => {
          console.log(res)
        }
      }
        // no use for handleVerify, so it is removed
        enableTelemetry
    >
        {({ open }) => <button onClick={open}>Verify with World ID</button>}
    </IDKitWidget>
    <br/>
    <br/>
    <br/>
    <span onClick={() => setClaimView(true)} style={{textDecoration: claimView ? 'underline' : 'none'}}>collect</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span onClick={() => setClaimView(false)} style={{textDecoration: !claimView ? 'underline' : 'none'}}>swap</span>
    <br/>
    <br/>
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
      <>
      <span>{`${'USDC 100'} ⚭ ${price}`}</span>
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
  </div>
  );
}

export default App;