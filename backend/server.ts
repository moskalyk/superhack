require('dotenv').config()
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {ethers, utils} from 'ethers'
import { SequenceIndexerClient } from '@0xsequence/indexer'

const pkey = process.env.pkey!
const wallet = new ethers.Wallet(pkey);
const PORT = process.env.PORT || 4000
const app = express();

const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/optimism');

const indexer = new SequenceIndexerClient('https://optimism-indexer.sequence.app')

const corsOptions = {
    origin: ['http://localhost:3000'],
};
  
app.use(cors(corsOptions));

app.use(bodyParser.json())

//blueberry api
var user_access_token = "";
var user_id = "";
let API_KEY = process.env.API_KEY;

async function loginAndGetData(email, password) {

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    email: email,
    password: password,
    returnSecureToken: true,
  });

  // try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    user_access_token = data.idToken;
    user_id = data.localId;
    return await fetchData(user_id);
  // } catch (error) {
    // console.error('Error logging in:', email, error.message);
  // }
}

function normalizeArray(arr) {
    if (arr.length === 0) {
        throw new Error("Array must not be empty.");
    }

    const min = Math.min(...arr);
    const max = Math.max(...arr);

    const normalizedArray = arr.map((value) => (value - min) * (255 / (max - min)));

    return normalizedArray;
}
  
async function fetchData(user_id: any) {
  var startTimeVal = Date.now()/1000.0 - 120.0 * 60.0; //default to last 60 minutes of data
  var endTimeVal = Date.now()/1000.0;
  var query_start_time = startTimeVal;
  var query_end_time = endTimeVal;
  var numberOfDocuments = 10;

  const structure_query_compute = {
    "structuredQuery": {
      "from": [{
        "collectionId": "computed_data",
      }],
      "orderBy": { "direction": "DESCENDING", "field": { "fieldPath": 'timestamp' } },
      "where": {
        "compositeFilter": {
          "op": "AND",
          "filters": [
            {
              "fieldFilter": {
                "field": { "fieldPath": "timestamp" },
                "op": "GREATER_THAN",
                "value": { "doubleValue": query_start_time }
              }
            },
            {
              "fieldFilter": {
                "field": { "fieldPath": "timestamp" },
                "op": "LESS_THAN",
                "value": { "doubleValue": query_end_time }
              }
            }
          ]
        }
      },
      "limit": (numberOfDocuments) + 1,
    },
    "newTransaction": {}
  };

  const url = `https://firestore.googleapis.com/v1/projects/blueberry-x-proj/databases/(default)/documents/userComputedData/${user_id}:runQuery?key=${API_KEY}`;

  const headers = {
    'Authorization': `Bearer ${user_access_token}`,
    'Content-Type': 'application/json',
  };

  // try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(structure_query_compute),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const array = []
    console.log('-------')
    for (let i = 1; i < data.length - 2; i++) {
        console.log(Math.floor(data[i + 1].document.fields.avg850nm27mm.doubleValue))
        array.push(Math.floor(data[i + 1].document.fields.avg850nm27mm.doubleValue))
    }
    return normalizeArray(array)
  // } catch (error) {
    // console.error('Error fetching data:', error.message);
  // }
}
function dotProduct(arr1, arr2) {
  return arr1.reduce((sum, value, index) => sum + value * arr2[index], 0);
}

function magnitude(arr) {
  return Math.sqrt(arr.reduce((sum, value) => sum + value * value, 0));
}

function cosineSimilarity(arr1, arr2) {
  if (arr1.length !== arr2.length) {
      throw new Error('Array lengths must be the same');
  }

  const dotProd = dotProduct(arr1, arr2);
  const mag1 = magnitude(arr1);
  const mag2 = magnitude(arr2);

  if (mag1 === 0 || mag2 === 0) {
      return 0; // Avoid division by zero
  }

  return dotProd / (mag1 * mag2);
}

function findCosineSimilarityInArrays(arrayOfArrays) {
  let totalSimilarity = 0;
  let totalPairs = 0;

  for (let i = 0; i < arrayOfArrays.length - 1; i++) {
    for (let j = i + 1; j < arrayOfArrays.length; j++) {
      const similarity = cosineSimilarity(arrayOfArrays[i], arrayOfArrays[j]);
      totalSimilarity += similarity;
      totalPairs++;
    }
  }

  // Calculate the average similarity
  const averageSimilarity = totalSimilarity / totalPairs;
  return averageSimilarity;
}

function isLessThan60SecondsAgo(dateString) {
  // Convert input date string to a Date object
  const inputDate: any = new Date(dateString);

  // Get the current date and time
  const currentDate: any = new Date();

  // Calculate the time difference in milliseconds
  const timeDifference = currentDate - inputDate;

  // Compare the time difference with 60,000 milliseconds (60 seconds)
  return timeDifference < 20000 /*00000*/;
}

const apiKey = process.env.API_KEY_WEATHER; // Replace with your actual API key
const city = 'Toronto'; // Replace with the desired city name
const countryCode = 'CA'; // Replace with the country code of the desired location

// Construct the API URL
const apiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city},${countryCode}&appid=${apiKey}`;

// Function to get the sunrise time
async function getSunriseTime() {
  try {
    console.log(apiUrl)
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log(data)
    if (data.cod === 200) {
      const sunriseTimestamp = data.sys.sunrise;
      const sunriseTime = new Date(sunriseTimestamp * 1000); // Convert to milliseconds
      return sunriseTime;
    } else {
      throw new Error('Error fetching data from the API.');
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

// Call the function to get the sunrise time and log it

app.post('/bridge/quote', async (req: any, res: any) => {
  // listen for transactions in the last minute
  // if true sign message, and return

  // try any account address you'd like :)
  const filter = {
      accountAddress: "0xBAbebe9FE973a5735D486BF6D31e9a027248024e"
  }

  // query Sequence Indexer for all token transaction history on Polygon
  const transactionHistory = await indexer.getTransactionHistory({
      filter: filter,
      includeMetadata: true
  })
  let breakTrue = false;
  const users = [
            {
                email: process.env.USER_NAME_1,
                password: process.env.PASSWORD_1
            },
            {
                email: process.env.USER_NAME_2,
                password: process.env.PASSWORD_2
            }
        ]

  console.log('transaction history in account:', transactionHistory)
  for(let i = 0; i < transactionHistory.transactions.length; i++){
    for(let j = 0; j < transactionHistory.transactions[i].transfers.length; j++){
      if(transactionHistory.transactions[i].transfers[j].to == '0x0000000000000000000000000000000000000000' && Number(transactionHistory.transactions[i].transfers[j].amounts[0]) >= Number(req.body.amount)&& isLessThan60SecondsAgo(transactionHistory.transactions[i].timestamp)){
        const promises = users.map((user: any) => loginAndGetData(user.email, user.password));
        let price;
        console.log('running')

        try {
          const results = await Promise.all(promises);
          console.log('testing')
          price = Math.floor(findCosineSimilarityInArrays(results)*100)
        }catch(err){
          const sunriseTime = await getSunriseTime()
          const ratio = (86400*1000-(Date.now()-Number(sunriseTime)))/(86400*1000)
            const sineValue = Math.sin(ratio * Math.PI * 2); // Using 2 * PI to complete one full cycle
            const mappedValue = (sineValue + 1) / 2; // Map from -1 to 1 to 0 to 1
          
            console.log('Mapped sine value:', 10*1*10**18*(97.5+5*mappedValue)/100);
            price = 1*10**18*(97.5+5*mappedValue)/100
        }

        const latestBlockNumber = await provider.getBlockNumber();
        const hash = utils.solidityKeccak256(['uint', 'uint', 'uint'], [price, latestBlockNumber, 10])
        const signature = await wallet.signMessage(ethers.utils.arrayify(hash))

        // perform onchain transaction

        // your contract address
        const contractAddress = '0x'

          // Craft your transaction
        const erc20Interface = new ethers.utils.Interface([
          'function bridge(address recipient_, uint256 amount, uint blockNumber, uint price, uint chainId, bytes memory xProof) public'
        ])
      
        const data = erc20Interface.encodeFunctionData(
          'bridge', [
            req.body.accountAddress,
            req.body.amount,
            latestBlockNumber,
            price,
            10,
            signature
          ])

        const txn = {
          to: contractAddress,
          data
        }

        // TODO: perform relay

        res.send({tx: txn})
        breakTrue = true 
        break;
      } else {
        console.log('nothing')
      }
    }
    if(breakTrue) break;
  }
  if(!breakTrue) res.sendStatus(400)
})

app.get('/quote', async (req: any, res: any) => {
    try{
        const users = [
            {
                email: process.env.USER_NAME_1,
                password: process.env.PASSWORD_1
            },
            {
                email: process.env.USER_NAME_2,
                password: process.env.PASSWORD_2
            }
        ]
        let results;
        let price;
        try{
          const promises = users.map((user: any) => loginAndGetData(user.email, user.password));
          results = await Promise.all(promises);
          price = Math.floor(findCosineSimilarityInArrays(results)*100)
        }catch(err){
          const sunriseTime = await getSunriseTime()
          const ratio = (86400*1000-(Date.now()-Number(sunriseTime)))/(86400*1000)
            const sineValue = Math.sin(ratio * Math.PI * 2); // Using 2 * PI to complete one full cycle
            const mappedValue = (sineValue + 1) / 2; // Map from -1 to 1 to 0 to 1
          
            console.log('Elapsed ratio:', ratio);
            console.log('Mapped sine value:', 10*1*10**18);
            console.log('Mapped sine value:', 10*1*10**18*(97.5+5*mappedValue)/100);
            price = 1*10**18*(97.5+5*mappedValue)/100
        }
        const latestBlockNumber = await provider.getBlockNumber();
        const hash = utils.solidityKeccak256(['uint', 'uint'], [price.toString(), latestBlockNumber])
        const signature = await wallet.signMessage(ethers.utils.arrayify(hash))
        console.log('testing')
        res.send({sig: signature, quote: price, block: latestBlockNumber, status: 200})
    }catch(e){
        res.send({msg: e, status: 500})
    }
})

app.get('/status', (req,res) => {
    res.sendStatus(200)
})

app.listen(PORT, async () => {
    console.log(`listening on port: ${PORT}`)
})