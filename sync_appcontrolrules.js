require("dotenv").config();

const axios = require('axios');
const base64 = require('base-64');
const mongodb = require('mongodb');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const baseUrl = process.env.SOPHOS_URL
const apiToken = process.env.SOPHOS_API_KEY
const encodedToken = base64.encode('token:' + apiToken);

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encodedToken}`
  }
});

const MongoClient = mongodb.MongoClient;
const url = process.env.URL;
const dbName = 'sophos';

const insertData = async (data) => {
  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true });
    const db = client.db(dbName);
    const collection = db.collection('ApplicationControlRules');

    // Prepare the bulk operations array
    const bulkOps = data.map((document) => {
      return {
        updateOne: {
          filter: { _ref: document._ref },
          update: { $set: document },
          upsert: true
        }
      };
    });

    // Execute the bulkWrite operation
    const result = await collection.bulkWrite(bulkOps);
    //console.log(`Data updated in MongoDB. ${result.modifiedCount} documents modified.`);
    console.log(`Data updated in MongoDB: ${JSON.stringify(result)}`);
    client.close();
  } catch (error) {
    console.error(error);
  }
};

const getAllApplicationControlRules = async () => {
  try {
    const response = await api.get('/objects/application_control/rule/');
    insertData(response.data);
  } catch (error) {
    console.error(error);
  }
};

getAllApplicationControlRules();
