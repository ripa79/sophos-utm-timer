Needed environment variables:
# the port that application runs
export PORT=3000
# mongodb url 
export URL='mongodb://<user>:<password>@<server_name>:PORT'
# the user that can login into the app
export USER=admin
# user password 
export PASSWORD=xxx
# the sophos utm api key
export SOPHOS_API_KEY='xxx'
# the sophos appliance url
export SOPHOS_URL='https://<server_name>:4444/api/'
# timer interval in minutes
export TIMER_INTERVAL=5

MongoDB will have 2 collections ApplicationControlRules and TimePeriods
Populate the mongodb to have the application control rules from the Sophos API:
$ node sync_appcontrolrules.js

to run the timer app:
$ node index.js

Timer app has simple web ui in:
http://<server>:PORT/time-periods
