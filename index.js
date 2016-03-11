var Q = require('q');
var es = require('event-stream');

function dirPath(path){
    var match = path.trim().match(/^(\/?)(.*?)\/?$/);
    var result = match[1] + match[2]
    return (result.length == 0) ? '' : ((result == '/') ? result : (result + '/'));
}

function filePath(path){
    var match = path.trim().match(/^(\/?)(.*?)\/?$/);
    var result = match[1] + match[2]
    return match[1] + match[2];
}

function countPathLayer(path){
    var dPath = dirPath(path);
    return (dPath.length == 0) ? 0 : ((dPath == '/') ? 1 : (dPath.split('/').length - 2));
}

function splitPaths(paths){
    var pathList = paths.split(',');
    var list = [];
    for(var i=0 ; i<pathList.length ; i++){
        list.push(pathList[i].trim());
    }
    return list;
}

function streamsPromise(){
    var streams = arguments;
    var deferred = Q.defer();
    var endNum = 0;
    var onStreamEnd = function(){
        endNum++;
        if(endNum == streams.length){
            deferred.resolve();
        }
    };
    var onStreamError = function(){
        deferred.reject();
    };
    for(var i=0 ; i<streams.length ; i++){
        streams[i]
            .on('end', onStreamEnd)
            .on('error', onStreamError)
    }
    return deferred.promise;
}

function streamsFnPromise(){
    var fns = arguments;
    var streams = [];
    for(var i=0 ; i<fns.length ; i++){
        streams.push(fns[i]());
    }
    return streamsPromise.apply(this, streams);
}

function logStream(fn, args){
    var deferred = Q.defer();
    var startTime = new Date().getTime();
    console.log("Starting '" + fn.name + "'");
    fn.apply(this, args).on('end', function(){
            deferred.resolve();
            console.log("Finished '" + fn.name + "' after " + (new Date().getTime() - startTime) + 'ms');})
        .on('error', function(error){
            deferred.reject();
            console.log("'" + fn.name + "' errored after " + (new Date().getTime() - startTime) + 'ms');});
    return deferred.promise;
}

function logPromise(fn, args){
    var deferred = Q.defer();
    var startTime = new Date().getTime();
    console.log("Starting '" + fn.name + "'");
    fn.apply(this, args).then(function(){
            deferred.resolve();
            console.log("Finished '" + fn.name + "' after " + (new Date().getTime() - startTime) + 'ms');})
        .catch(function(error){
            deferred.reject();
            console.log("'" + fn.name + "' errored after " + (new Date().getTime() - startTime) + 'ms');});
    return deferred.promise;
}

function replaceEnv(layerNum){
    var relativePath = '.';
    if(layerNum > 0){
        var layerList = [];
        for(var i=0 ; i<layerNum ; i++){
            layerList.push('..');
        }
        relativePath = layerList.join('/');
    }
    return es.map(function(file, cb){
        var reslut = file.contents.toString().replace(/\$ROOT\$/g, relativePath);
        file.contents = new Buffer(reslut);
        cb(null, file);
    });
}


var result = {
    dirPath : dirPath,
    filePath : filePath,
    countPathLayer : countPathLayer,
    splitPaths : splitPaths,
    streamsPromise : streamsPromise,
    streamsFnPromise : streamsFnPromise,
    logStream : logStream,
    logPromise : logPromise,
    replaceEnv : replaceEnv
};

if(typeof(window) != 'undefined' && window != null){
    window['gulp-template-util'] = result;
}

if(typeof(module) != 'undefined' && module != null){
    module.exports = result;    
}