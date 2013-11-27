ThePhish = function() {
	this.injectApp(function(data) {
		console.log("Injected javascript.", data);
	});
}
ThePhish.prototype = {

                constructor : ThePhish,
                injectApp : function(callback){
                        var self = this;//Keep plug object in scope while using jquery callbacks.
									$.getScript(chrome.extension.getURL("scripts/content.js"))
									.done(function(e){
											console.log("Extension loaded!");
									})
									.fail(function(){
											console.warn("Extension did not load!");
									})

                                callback(self);

                }
}
console.log('injector');
thePhish = new ThePhish();