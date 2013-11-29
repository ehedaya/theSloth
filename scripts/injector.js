ThePhish = function() {
	this.injectApp(function(data) {
		console.log("Injecting javascript...");
	});
}
ThePhish.prototype = {

                constructor : ThePhish,
                injectApp : function(callback){
                        var self = this;//Keep plug object in scope while using jquery callbacks.
									$.getScript(chrome.extension.getURL("scripts/content.js"))
									.done(function(e){
											console.log("Injected content.js");
									})
									.fail(function(){
											console.warn("Failed to inject content.js");
									})
									
									$.getScript(chrome.extension.getURL("scripts/date.js"))
									.done(function(e) {
										console.log("Injected date.js");
									})
									.fail(function(){
											console.warn("Failed to inject date.js.");
									})

                                callback(self);

                }
}
thePhish = new ThePhish();