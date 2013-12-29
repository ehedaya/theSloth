$(document).ready(function() {
	$('#phish_content').hide();
	$('#alt_content').hide();

	$('#setlist small').text('Loading setlist');
	TemplateCache = {
		get: function(filename, callback) {
			$.get('templates/'+filename+'.html', function(data) {
				console.log(data);
				callback(Handlebars.compile(data));
			});
		}
	};
	$.ajax({
		crossDomain:true,
		type: "GET",
		url: "http://stats.thephish.fm/api/getRecentPlays.php",
		data: { n : 1},
		success: function(data){
			var json = JSON.parse(data);
			var recent_play = json.list[0];
			TemplateCache.get('setlist', function(template) {
				console.log(template);
				console.log(recent_play);
				var html = template(recent_play);
				console.log(html);
				$('#content').html(html);
			});
			$('#loader').remove();
		}
	});
});
