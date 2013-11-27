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
											console.log("Injection success.");
									})
									.fail(function(){
											console.warn("Injection failed.");
									})

                                callback(self);

                }
}
thePhish = new ThePhish();