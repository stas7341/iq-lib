/*
Use cases:
1. application uses no subscribers
1.1 on IQ creation, manager will call createQueue with criteria
1.2 on queueing message, IQ mng will call group manager to procedure msg.payload+criteria where result be
a new or an existing group that message queued in
1.3 on popup group, IQ mng will fetch all messages and return all of them

2. application uses http subscribers
2.1 on http request subscriber, where subscriber will define the notification transport and criteria
2.2 application will manage subscribers and will start to listen on requested amqp queue
2.3 same as above 1.1
2.4 on message arrives to amqp, application will call IQ mng to add message to queue
2.5.same as 1.2
2.6 on success 2.5, application should notify client according to the subscription
2.7 on http request of popup, same as 1.3 in addition the invokeId(transaction), according for the option
of recovery the application will moved this group to pending queue
2.8 on request of transaction completed the IQ mng will delete permanently all messages in pending group
2.9 scheduler service of application will check all pending group for expiry time
 */
