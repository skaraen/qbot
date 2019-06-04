var limdu = require('limdu');
var mongoose = require('mongoose')
var logSchema = require('./schema')
var data = require('./data')

const url = 'mongodb://localhost/qbot';

mongoose.connect(url,{useNewUrlParser: true})
                    .then(res => console.log("Instantiating models..."))
                    .catch(err => console.log(err));

let logModel = mongoose.model('log',logSchema);

var TextClassifier = limdu.classifiers.multilabel.BinaryRelevance.bind(0, {
	binaryClassifierType: limdu.classifiers.Winnow.bind(0, {retrain_count: 10})
});

// Now define our feature extractor - a function that takes a sample and adds features to a given features set:
var WordExtractor = function(input, features) {
	input.split(' ').join(',').split('.').join(',').split('?').join(',').split(',').forEach(function(word) {
		features[word]=1;
	});
};

var actionClassifier = new limdu.classifiers.EnhancedClassifier({
    classifierType: TextClassifier,
    normalizer: limdu.features.LowerCaseNormalizer,
	featureExtractor: WordExtractor
});

var tempClassifier = new limdu.classifiers.Bayesian();

logModel.find({},function(err,res){
    if(err) throw err;
    console.log(res);
    if(res.length==0){
        logModel.insertMany(data,function(err,docs){
            if(err) throw err;
            console.log('Initiation !');
            actionClassifier.trainBatch(data);
            actionClassifier.retrain();
        })
    }
    else{
        res.forEach(function(doc,index){
            actionClassifier.trainOnline(doc.input, doc.output);
            console.log("Training "+index+" over");
            actionClassifier.retrain();
        })
    }
});

// intentClassifier.classifyAndLog("I want an apple and a banana");

module.exports = actionClassifier;
