require("dotenv").config();

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
var mongodb = require('mongodb');
const app = express();
const url = process.env.URL;
const dbName = 'sophos';
const bodyParser = require('body-parser');
const path = require('path');
const interval = require('set-interval');
const axios = require('axios');
const base64 = require('base-64');

// this is needed to be able to use the sophos api if the cert is not trusted
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const basicAuth = require('express-basic-auth')

app.use(basicAuth({
    challenge: true,
    // modify to your own needs
    users: { [process.env.USER]: process.env.PASSWORD }
}))

// env vars for sophos
const baseUrl = process.env.SOPHOS_URL;
const apiToken = process.env.SOPHOS_API_KEY;

const encodedToken = base64.encode('token:' + apiToken);

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encodedToken}`
  }
});


app.use(express.static(path.join(__dirname, 'css')));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
 });
app.set('views', './views')
app.set('view engine', 'pug');

function convertToArray(input) {
    if (Array.isArray(input)) {
        return input;
    } else {
        return input.split(",");
    }
}


// Connect to MongoDB
const client = new MongoClient(url, { useNewUrlParser: true });
client.connect((err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Connected to MongoDB');
});

app.get('/time-periods', async (req, res) => {
    const db = client.db(dbName);
    const timePeriodsCollection = db.collection('TimePeriods');
    const timePeriods = await timePeriodsCollection.find().toArray();
    const ApplicationControlRulesCollection = db.collection('ApplicationControlRules');
    const ApplicationControlRules = await ApplicationControlRulesCollection.find().toArray();
    const map = new Map();
    ApplicationControlRules.forEach(document => {
        map.set(document._ref, document.name);
    });
    const ApplicationControlRules_Ref = ApplicationControlRules.map(ApplicationControlRules => ApplicationControlRules._ref);
    res.render('timePeriods', { timePeriods, ApplicationControlRules_Ref, ApplicationControlRules });
});

app.post('/time-periods', async (req, res, next) => {
    try{
        
        const db = client.db(dbName);
        const timePeriodsCollection = db.collection('TimePeriods');
       
        const days = convertToArray(req.body.days);
        const newTimePeriod = {
            name: req.body.name,
            days: days,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            ref: req.body.ref
        };
        await timePeriodsCollection.insertOne(newTimePeriod);
        res.redirect('/time-periods');
    }catch(err){
      next(err);
    }
});

// Edit time period
app.get('/time-periods/:id/edit', async (req, res) => {
    const db = client.db(dbName);
    const timePeriodsCollection = db.collection('TimePeriods');
    const timePeriod = await timePeriodsCollection.findOne({ _id: req.params.id });
    const ApplicationControlRulesCollection = db.collection('ApplicationControlRules');
    const ApplicationControlRules = await ApplicationControlRulesCollection.find().toArray();
    const ApplicationControlRules_Ref = ApplicationControlRules.map(ApplicationControlRules => ApplicationControlRules._ref);
    res.render('editTimePeriod', { timePeriod, ApplicationControlRules_Ref });
});

app.post('/time-periods/:id/edit', async (req, res, next) => {
    try{
        const db = client.db(dbName);
        const timePeriodsCollection = db.collection('TimePeriods');
        const days = convertToArray(req.body.days);
        const updatedTimePeriod = {
            name: req.body.name,
            days: days,
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };
        await timePeriodsCollection.updateOne({ _id: req.params.id }, { $set: updatedTimePeriod });
        res.redirect('/time-periods');
    }catch(err){
      next(err);
    }
});

// Delete time period
app.get('/time-periods/:id/delete', async (req, res) => {
    const db = client.db(dbName);
    const timePeriodsCollection = db.collection('TimePeriods');
    //console.log(req);
    await timePeriodsCollection.deleteOne({ _id: new mongodb.ObjectID(req.params.id) });
    res.redirect('/time-periods');
});


// Get all timeperiods from the TimePeriods collection
async function getTimePeriods() {
    const db = client.db(dbName);
    const timePeriodsCollection = db.collection('TimePeriods');
    const timePeriods = await timePeriodsCollection.find().toArray();
    return timePeriods;
}

async function checkTiming() {
    const timePeriods = await getTimePeriods();
    const currentDate = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[currentDate.getDay()];
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();


    timePeriods.forEach(timePeriod => {
        const startTimeMinutes = convertTimeToMinutes(timePeriod.startTime);

        const endTimeMinutes = convertTimeToMinutes(timePeriod.endTime);

        if (timePeriod.days.includes(currentDayName) && currentMinutes >= startTimeMinutes && currentMinutes <= endTimeMinutes) {
            //console.log(`Time period ${timePeriod.name} started`);
            //enableApplicationControlRule(timePeriod.ref);
        } else if (!timePeriod.days.includes(currentDayName) || currentMinutes < startTimeMinutes || currentMinutes > endTimeMinutes) {
            disableApplicationControlRule(timePeriod.ref);
        }
    });
}


function convertTimeToMinutes(time) {
    const [hours, minutes] = time.split(':');
    return parseInt(hours) * 60 + parseInt(minutes);
}


//interval.start(checkTiming, 5000);



async function enableApplicationControlRule(ruleRef) {
    try {
        const response = await await api.put(`/objects/application_control/rule/${ruleRef}`, {
            status: true
        });
        console.log(`ApplicationControlRule ${ruleRef} enabled`);
    } catch (error) {
        console.error(`Error enabling ApplicationControlRule ${ruleRef}: ${error}`);
    }
}

async function disableApplicationControlRule(ruleRef) {
    //const response = await api.get('/objects/application_control/rule/');
    
    try {
        const response = await api.patch(`/objects/application_control/rule/${ruleRef}`, {
            status: false
        });
        console.log(`ApplicationControlRule ${ruleRef} disabled`);
    } catch (error) {
        console.error(`Error disabling ApplicationControlRule ${ruleRef}: ${error}`);
    }
}

function jsonToArray(json) {
    return Object.keys(json).map(function(key) {
        return { key: key, value: json[key] };
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App started on port ${port}`);
})
