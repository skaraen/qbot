const brain = require('brain.js')
var mongoose = require('mongoose')
var logSchema = require('./schema')

const url = 'mongodb://localhost/qbot';

mongoose.connect(url,{useNewUrlParser: true})
                    .then(res => console.log("Instantiating models..."))
                    .catch(err => console.log(err));

let logModel = mongoose.model('log',logSchema);
const brainet = new brain.recurrent.LSTM();

logModel.find({},function(err,res){
    if(err) throw err;
    console.log(res);
    if(res.length!=0&&res!=null){
        res.forEach(function(doc,index){
            brainet.train([{input:String(doc.input),output:String(doc.output)},]);
            console.log('Training :'+index);
        })
        // brainet.train(res);
        // console.log('Training complete')
    }
});

module.exports = brainet;