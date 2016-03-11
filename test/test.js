var assert = require('assert');
var EventEmitter = require('events');
var Q = require('q');
var es = require('event-stream');
var util = require('../index');

function createSuccessStream(){
	var emitter = new EventEmitter();
	setTimeout(function(){
		emitter.emit('end');
	}, Math.random() * 200);
	return emitter;
}

function createFailStream(){
	var emitter = new EventEmitter();
	setTimeout(function(){
		emitter.emit('error');
	}, Math.random() * 200);
	return emitter;
}

function createStream(success){
	return (success) ? createSuccessStream() : createFailStream();
}

describe('gulp-template-util', function() {
	it('#dirPath()', function(){
		assert.equal(util.dirPath('src/main/index'), 'src/main/index/');
		assert.equal(util.dirPath('src/main/index/'), 'src/main/index/');
		assert.equal(util.dirPath('/src/main/index'), '/src/main/index/');
		assert.equal(util.dirPath('/src/main/index/'), '/src/main/index/');
		assert.equal(util.dirPath('src'), 'src/');
		assert.equal(util.dirPath('src/'), 'src/');
		assert.equal(util.dirPath('/src'), '/src/');
		assert.equal(util.dirPath('/src/'), '/src/');
		assert.equal(util.dirPath('/'), '/');
		assert.equal(util.dirPath(''), '');
	});
	it('#filePath()', function(){
		assert.equal(util.filePath('src/main/index'), 'src/main/index');
		assert.equal(util.filePath('src/main/index/'), 'src/main/index');
		assert.equal(util.filePath('/src/main/index'), '/src/main/index');
		assert.equal(util.filePath('/src/main/index/'), '/src/main/index');
		assert.equal(util.filePath('src'), 'src');
		assert.equal(util.filePath('src/'), 'src');
		assert.equal(util.filePath('/src'), '/src');
		assert.equal(util.filePath('/src/'), '/src');
		assert.equal(util.filePath('/'), '/');
		assert.equal(util.filePath(''), '');
	});
	it('#countPathLayer()', function(){
		assert.equal(util.countPathLayer('src/main/index'), 2);
		assert.equal(util.countPathLayer('src/main/index/'), 2);
		assert.equal(util.countPathLayer('/src/main/index'), 3);
		assert.equal(util.countPathLayer('/src/main/index/'), 3);
		assert.equal(util.countPathLayer('src/main'), 1);
		assert.equal(util.countPathLayer('src/main/'), 1);
		assert.equal(util.countPathLayer('/src/main'), 2);
		assert.equal(util.countPathLayer('/src/main/'), 2);
		assert.equal(util.countPathLayer('src'), 0);
		assert.equal(util.countPathLayer('src/'), 0);
		assert.equal(util.countPathLayer('/src'), 1);
		assert.equal(util.countPathLayer('/src/'), 1);
		assert.equal(util.countPathLayer('/'), 1);
		assert.equal(util.countPathLayer(''), 0);
	});
	it('#splitPaths()', function(){
		assert.deepEqual(util.splitPaths("src/main/index,src/main/site1,src/main,src"), ["src/main/index","src/main/site1","src/main","src"]);
		assert.deepEqual(util.splitPaths("src/main/index , src/main/site1 , src/main , src"), ["src/main/index","src/main/site1","src/main","src"]);
		assert.deepEqual(util.splitPaths("src/main/index,src"), ["src/main/index","src"]);
		assert.deepEqual(util.splitPaths("src/main/index , src"), ["src/main/index","src"]);
		assert.deepEqual(util.splitPaths("src/main/index"), ["src/main/index"]);
		assert.deepEqual(util.splitPaths(""), [""]);
	});
	describe('#streamsPromise()', function(){
		it('3 stream 3 success', function(){
			return util.streamsPromise(createStream(true), createStream(true), createStream(true));
		});
		it('1 stream 1 success', function(){
			return util.streamsPromise(createStream(true));
		});
		it('3 stream 2 success 1 fail', function(){
			var deferred = Q.defer();
			util.streamsPromise(createStream(true), createStream(false), createStream(true))
				.then(null, function(){
					deferred.resolve();
				});
			return deferred.promise;
		});
		it('1 stream 1 fail', function(){
			var deferred = Q.defer();
			util.streamsPromise(createStream(false))
				.then(null, function(){
					deferred.resolve();
				});
			return deferred.promise;
		});
	});
	describe('#streamsFnPromise()', function(){
		it('3 stream 3 success', function(){
			return util.streamsFnPromise(createSuccessStream, createSuccessStream, createSuccessStream);
		});
		it('1 stream 1 success', function(){
			return util.streamsFnPromise(createSuccessStream);
		});
		it('3 stream 2 success 1 fail', function(){
			var deferred = Q.defer();
			util.streamsFnPromise(createSuccessStream, createFailStream, createSuccessStream)
				.then(null, function(){
					deferred.resolve();
				});
			return deferred.promise;
		});
		it('1 stream 1 fail', function(){
			var deferred = Q.defer();
			util.streamsFnPromise(createFailStream)
				.then(null, function(){
					deferred.resolve();
				});
			return deferred.promise;
		});
	});
	describe('#replaceEnv()', function(){
		function createPathIt(layerNum, relativePath) {
			var deferred = Q.defer();
			es.readArray([{contents : new Buffer('import("$ROOT$/env")')}])
				.pipe(util.replaceEnv(layerNum))
				.pipe(es.map(function(file, cb){
					assert.equal(file.contents.toString(), 'import("' + relativePath + '/env")');
					deferred.resolve();
				}));
			return deferred.promise;
		};
		it('. path', function(){return createPathIt(0, '.');});
		it('.. path', function(){return createPathIt(1, '..');});
		it('../.. path', function(){return createPathIt(2, '../..');});
		it('../../.. path', function(){return createPathIt(3, '../../..');});
	});
});