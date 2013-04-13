#!/usr/bin/env sh
BASEDIR=$(cd $(dirname "$0"); pwd)
echo $BASEDIR

m=`pgrep -f "theSloth/bot.js" | wc -l`
if  [ $m -gt 0 ]
then
	cd $1
	m=`pgrep -f "theSloth/bot.js"`
	echo "Process $m found"
	now=`date +"%s"`
	last=`cat $BASEDIR/.heartbeat`
	diff=`expr $now - $last`
	if [ $diff -gt 360 ] 
	then
        echo "Last activity $diff second(s) ago, rebooting"
		kill $m
		/usr/bin/nohup /usr/local/bin/node $BASEDIR/bot.js >> $BASEDIR/logs/theSloth.`date +"%Y%m%d"`.out 2>&1&
		echo "theSloth was restarted (last activity $diff seconds ago)"
	else 
		echo "Last activity $diff second(s) ago"
	fi
else
	echo "Process not found"
	/usr/bin/nohup /usr/local/bin/node $BASEDIR/bot.js >> $BASEDIR/logs/theSloth.`date +"%Y%m%d"`.out 2>&1&
fi

