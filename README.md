to run:
1. export env variables or use .env file:
    - export PORT=3000 : the port that application runs
    - export URL='mongodb://root:xxx@192.168.11.178:27017' : mongodb url
    - export USER=admin : the user that can login into the app
    - export PASSWORD=xxx : user password
    - export SOPHOS_API_KEY='xxx' : the sophos utm api key
    - export SOPHOS_URL='https://192.168.11.100:4444/api/' : the sophos appliance url
2. node index.js