const mongoose = require('mongoose')

let logSchema=mongoose.Schema({
    input:String,
    output:String
})

module.exports = logSchema;