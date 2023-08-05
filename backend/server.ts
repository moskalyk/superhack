require('dotenv').config()
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {ethers, utils} from 'ethers'
const pkey = process.env.pkey!
const wallet = new ethers.Wallet(pkey);
const PORT = process.env.PORT || 4000
const app = express();

const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/optimism');

const corsOptions = {
    origin: ['https://round-mouse-4296.on.fleek.co', 'http://localhost:3001'],
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

  try {
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
  } catch (error) {
    console.error('Error logging in:', email, error.message);
  }
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

  try {
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
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
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
        const promises = users.map((user: any) => loginAndGetData(user.email, user.password));
        const results = await Promise.all(promises);
        const latestBlockNumber = await provider.getBlockNumber();
        const hash = utils.solidityKeccak256(['uint', 'uint'], [Math.floor(findCosineSimilarityInArrays(results)*100), latestBlockNumber])
        const signature = await wallet.signMessage(ethers.utils.arrayify(hash))
        res.send({sig: signature, quote: Math.floor(findCosineSimilarityInArrays(results)*100), block: latestBlockNumber, status: 200})
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