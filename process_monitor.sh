#!/usr/bin/env sh
m=`pgrep -f "theSloth/bot.js" | wc -l`
if  [ $m -gt 0 ]
then
	m=`pgrep -f "theSloth/bot.js"`
	echo "Process $m found"
	now=`date +"%s"`
	last=`cat /home/thephishvps/tmp/theSloth`
	diff=`expr $now - $last`;
	if [ $diff -gt 360 ] 
	then
        echo "Last activity $diff second(s) ago, rebooting"
		kill $m
		/usr/bin/nohup /home/thephishvps/usr/local/bin/node /home/thephishvps/bots/theSloth/bot.js >> /home/thephishvps/bots/theSloth.out 2>&1&
		mail -s "theSloth was restarted (last activity $diff seconds ago)" emil@thephish.fm
	else 
		echo "Last activity $diff second(s) ago"
	fi
else
	/usr/bin/nohup /home/thephishvps/usr/local/bin/node /home/thephishvps/bots/theSloth/bot.js >> /home/thephishvps/bots/theSloth.out 2>&1&
	mail -s "theSloth process died, restarted" emil@thephish.fm
fi

