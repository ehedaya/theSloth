ThePhish = function() {
	console.log("Line 2", this);
	this.injectApp(function(data) {
		console.log("Line 4", data);
	});
}
ThePhish.prototype = {

                constructor : ThePhish,

                injectApp : function(callback){
                        console.log("Line 13 Injecting javascript.");

                        var self = this;//Keep plug object in scope while using jquery callbacks.
								$.getScript(chrome.extension.getURL("scripts/jquery.js")).done(function() {
									console.log("Jquery", $);
									$.getScript(chrome.extension.getURL("scripts/content.js"))
									.done(function(e){
											console.log("Extension loaded!");
									})
									.fail(function(){
											console.warn("Extension did not load!");
									})
								});

                                callback(self);//If this fails then crash. Nothing would work anyways.

                }
}
console.log('injector');
thePhish = new ThePhish();