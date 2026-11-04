import { getCurrentSegment, finalizeCurrentSegment, type Segment, setSessionStartTime, setCurrentSegment, getOpenOnStartup, getIdleMinutes, getAutoStopMinutes } from "./utils/storage";


function openCustomWindow() {
    chrome.windows.create({
      url: "index.html",
      type: "popup",
      width: 400,
      height: 180
    });
}

const applyIdleSetting = async () => {
    const idleMinutes = await getIdleMinutes()
    if(idleMinutes >= 1){
        const idleSeconds = idleMinutes * 60
        chrome.idle.setDetectionInterval(idleSeconds)
    }
}
applyIdleSetting();

chrome.storage.onChanged.addListener((changes) => {
    if(changes.idleMinutes){
        applyIdleSetting();
    }
})

chrome.runtime.onInstalled.addListener(() => {
    openCustomWindow();
});

chrome.runtime.onStartup.addListener( async () => {
    const openOnStartup = await getOpenOnStartup()
    if(openOnStartup) openCustomWindow();
})

chrome.action.onClicked.addListener(() => {
    openCustomWindow();
});


//操作の有無で送られるidleやactiveのステータスに合わせて、nextCurrentSegmentを作成し、CurrentSegmmentのendTimeを作成し、finalizeCurrentSegmentに渡す。
chrome.idle.onStateChanged.addListener(async (newState) => {
    if(newState === 'idle'){
        const currentSegment = await getCurrentSegment()
        if(currentSegment === null){
            return
        }
        const idleMinutes = await getIdleMinutes()
        let boundaryTime = Date.now() - (idleMinutes * 60 * 1000)
        if(boundaryTime < currentSegment.startTime){
            boundaryTime = currentSegment.startTime
        }
        const nextCurrentSegment : Segment = {
            id : Date.now(),
            startTime : boundaryTime,
            endTime : null,
            projectId : currentSegment.projectId,
            status : 'idle'
        }
        await finalizeCurrentSegment(boundaryTime,nextCurrentSegment)

        const autoStopMinutes = await getAutoStopMinutes()
        const delay = Math.max(1, autoStopMinutes - idleMinutes)
        chrome.alarms.create('autoStopTracking', { delayInMinutes: delay })

    } else if(newState === 'active'){
        const currentSegment = await getCurrentSegment()
        if(currentSegment === null){
            return
        }
        const nextCurrentSegment : Segment = {
            id : Date.now(),
            startTime : Date.now(),
            endTime : null,
            projectId : currentSegment.projectId,
            status : 'working'
        }
        await finalizeCurrentSegment(Date.now(),nextCurrentSegment)
        chrome.alarms.clear('autoStopTracking')
    }
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if(alarm.name === 'autoStopTracking'){
        await finalizeCurrentSegment(Date.now(),null)
        await setSessionStartTime(null)
    }
})

chrome.runtime.onMessage.addListener(async (message) => {
    if(message.type === 'STOP_TRACKING'){
        await finalizeCurrentSegment(Date.now(),null)
        await setSessionStartTime(null)
    } else if(message.type === 'SET_ACTIVE_PROJECT'){
        const currentSegment = await getCurrentSegment()
        const newSegment : Segment = {
            id : Date.now(),
            startTime : Date.now(),
            endTime : null,
            projectId : message.projectId,
            status : 'working'
        }
        if(currentSegment === null){
            await setCurrentSegment(newSegment)
            await setSessionStartTime(Date.now())
        } else {
            await finalizeCurrentSegment(Date.now(),newSegment)
        }
    }
})



