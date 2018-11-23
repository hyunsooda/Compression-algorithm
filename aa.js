

const Events = ( () => {
    const eventPool = [];

    return class {
        static findEvent(eventName) {
            let foundEvent;

            for(let event of eventPool) {
                if(event.eventName === eventName) {
                    foundEvent = event;
                    break;
                }
            }
            
            return foundEvent ? foundEvent : false;
        }
        static on(eventName,callback) {
            const e = Events.findEvent(eventName);

            if(!e) {
                eventPool.push({
                    eventName : eventName,
                    callback : [callback]
                });
            } else 
                e.callback.push(callback);
        }
        static trigger(eventName,data) {
            const event = Events.findEvent(eventName);

            if(!event) return;
            else {
                for(let callback of event.callback)
                    callback(data);
            }
        }
        static off(eventName,callback) {
            const event = Events.findEvent(eventName);

            for(let i=0; i<event.callback.length; i++) {
                if(event.callback[i] === callback) {
                    event.callback.splice(i,1);
                    break;
                }
            }
        }
    }
})();

module.exports = Events;