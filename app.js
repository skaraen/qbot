const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const express = require('express')
const app = express();
let assigner = require('./assigner')
const logSchema = require('./schema')
var weather_api = require('openweather-apis');
var request = require('request');
var rp = require('request-promise')
let apiKey = 'a3fbb9fd55b7f3d9a02c6ed9418a6fc7';
// let brainet = require('./qbrain')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

const url = process.env.MONGO_URL;
console.log(process.env)
console.log(url);

mongoose.connect(url, { useNewUrlParser: true })
    .then(res => console.log("Connected to DB"))
    .catch(err => console.log(err));

let logModel = mongoose.model('log', logSchema);

let input_memory, output_memory, flag = 0;
var pf = false;

app.use(express.static('.'))

app.post('/query', function (req, res) {
    var intentName = req.body.queryResult.intent.displayName;
    if (intentName === 'AskWeather') {
        var city = req.body.queryResult.parameters["geo-city"];
        var fin = city;
        console.log("City: " + city);
        console.log("Final: " + fin);
        if (fin !== "") {
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${fin}&units=imperial&appid=${apiKey}`;
            request(url, function (err, response, body) {
                if (err) {
                    console.log('error:', err);
                } else {
                    console.log('body:', body);
                }
                let weather = JSON.parse(body);
                var descr = weather["weather"][0]["description"];
                let message = `It's ${weather.main.temp} degrees in ${weather.name}!And it looks ${descr}`;
                console.log(message);
                var responseObject = {
                    "fulfillmentText": message
                };
                res.json(responseObject);
            })

        }

    }
    else if (intentName === 'AskJokes') {
        let url = 'https://icanhazdadjoke.com/slack';
        request(url, function (err, response, body) {
            if (err) {
                console.log('error:', err);
            } else {
                console.log('body:', body);
            }
            var temp = JSON.parse(body);
            var message = temp["attachments"][0]["text"];
            console.log(message);
            var responseObject = {
                "fulfillmentText": message
            };
            res.json(responseObject);
        })

    }
    else if (intentName == 'Order.Pizza') {
        var body = req.body.queryResult;
        console.log(body);
        console.log("new: " + body.parameters.Sauce);
        var time = body.parameters.Time.substr(11, 15) + ' hrs';
        console.log(typeof time);
        console.log(time.substr(0, 4));
        time = time.substr(0, 5) + ' hrs';
        var responseObject = {
            "fulfillmentText": "Your order for " + body.parameters.Size + ' ' + body.parameters.Type + ' ' + body.parameters.Crust + ' ' + body.parameters.Sauce + ' with toppings as ' + body.parameters.Toppings + ' ' + 'will be delivered to ' + body.parameters.Address + ' at ' + time
        }
        res.json(responseObject);
    }
    else if (intentName === 'Default Fallback Intent') {
        var query = req.body.queryResult.queryText;
        var personal_list = ['my', 'mine', 'myself', 'her', 'hers', 'herself', 'him', 'himself', 'his', 'himslef', 'their', 'I', 'I\'m', 'me', 'favorite'];
        var user_query_list = query.split(' ');
        function isPresent(personal_list, val) {
            return personal_list.some(function (arrVal) {
                return val === arrVal;
            });
        }
        for (var i = 0; i < user_query_list.length; ++i) {
            if (isPresent(personal_list, user_query_list[i])) {
                pf = true;
                break;
            }
        }
        if (pf) {
            if (flag == 0) {
                input_memory = query;
                let response = assigner.classify(query)
                assigner.retrain();
                console.log(assigner.classify(query));
                if (response.length == 0) {
                    flag = 1;
                    return res.json({
                        "fulfillmentText": 'Oops couldn\'t find anything related to that. Tell me now so that I can remember it later',
                        "fulfillmentMessages": [{ text: { text: ['Oops couldn\'t find anything related to that. Tell me now so that I can remember it later'] } }],
                        "source": ""
                    })
                }
                else {
                    output_memory = response[0];
                    pf=false;
                    return res.json({
                        "fulfillmentText": response[0],
                        "fulfillmentMessages": [{ text: { text: [response[0]] } }],
                        "source": ""
                    })
                }
            }
            else if (flag == 1) {
                let logStruct = {
                    input: input_memory,
                    output: query
                }
                assigner.trainOnline(String(input_memory), String(query));
                assigner.retrain();
                flag = 0;
                pf = false;
                logModel.create(logStruct, function (err, docs) {
                    if (err) throw err;
                    console.log("Log entered !");
                })
                return res.json({
                    "fulfillmentText": 'Cool, I\'ll keep that in mind :)',
                    "fulfillmentMessages": [{ text: { text: ['Cool, I\'ll keep that in mind :)'] } }],
                    "source": ""
                })
            }
            else if (flag == 2) {
                let logStruct = {
                    input: input_memory,
                    output: query
                }
                logModel.updateMany({ output: output_memory }, logStruct, function (err, raw) {
                    if (err) throw err;
                    console.log('Log updated !');
                    assigner.trainOnline(String(input_memory), String(query));
                    assigner.retrain();
                    flag = 0;
                    pf = false;
                    return res.json({
                        "fulfillmentText": 'Memory updated XD',
                        "fulfillmentMessages": [{ text: { text: ['Memory updated XD'] } }],
                        "source": ""
                    })
                })
            }
            else if (flag == 3) {
                let logStruct = {
                    input: input_memory,
                    output: query
                }
                logModel.create(logStruct, function (err, docs) {
                    if (err) throw err;
                    console.log('Log corrected !');
                    assigner.trainOnline(String(input_memory), String(query));
                    assigner.retrain();
                    flag = 0;
                    pf = false;
                    return res.json({
                        "fulfillmentText": 'Mistakes will be avoided my lord !',
                        "fulfillmentMessages": [{ text: { text: ['Mistakes will be avoided my lord !'] } }],
                        "source": ""
                    })
                })
            }
        }
        else{
            // let url = "https://api.serpwow.com/live/search?api_key=4EEC3611&q=" + query;
            let url = "https://api.serpwow.com/live/search"
            // request(url, (err, response, body) => {
            //     if (err) throw err;
            //     body = JSON.parse(body);
            //     console.log(body["answer_box"]["answers"][0]["answer"]);
            //     return res.json({
            //         "fulfillmentText": body["answer_box"]["answers"][0]["answer"],
            //         "fulfillmentMessages": [{ text: { text: [body["answer_box"]["answers"][0]["answer"]] } }],
            //         "source": ""
            //     })
            // });
            var options = {
                uri:url,
                qs:{
                    api_key:'4EEC3611',
                    q:query
                },
                headers:{
                    'User-Agent':'Request-Promise'
                },
                json: true
            }
            
            rp(options).then(function(repos){
                console.log(repos);
                console.log(repos["answer_box"]["answers"][0]["answer"]);
                return res.json({
                    "fulfillmentText": repos["answer_box"]["answers"][0]["answer"],
                    "fulfillmentMessages": [{ text: { text: [repos["answer_box"]["answers"][0]["answer"]] } }],
                    "source": ""
                });
            }).catch(function(err){
                if(err) throw err;
            });
        }
    }
    else if (intentName === 'ChangeIntent - yes') {
        flag = 2;
        pf = true;
    }
    else if (intentName === 'CorrectIntent - yes') {
        flag = 3;
        pf = true;
    }
})

var server = app.listen(8000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
})