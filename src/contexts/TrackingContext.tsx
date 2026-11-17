import { createContext, useEffect, useState, useContext, type ReactNode } from 'react'
import { type Segment, getCurrentSegment, getSessionStartTime } from '../utils/storage'

export type TrackingContextType = {
    currentSegment : Segment | null
    startTracking : (projectId : number) => void
    stopTracking : () => void
    sessionStartTime : number | null
    elapsedSeconds : number
    // 現在時刻（ms）。計測中は1秒ごとに更新される
    now : number
}
const TrackingContext = createContext<TrackingContextType | undefined>(undefined)

export function useTrackingContext(){
    const context = useContext(TrackingContext)
    if(!context){
        throw new Error ('useTrackingContextはTrackingProviderの中で使ってください')
    }
    return context
}

export type TrackingProviderProps = {
    children : ReactNode
}

export function TrackingProvider({children}:TrackingProviderProps){
    const [ currentSegment, setCurrentSegment] = useState<Segment | null>(null)
    const [ sessionStartTime, setSessionStartTime ] = useState<number | null>(null)
    const [ now, setNow ] = useState<number>(() => Date.now())

    const startTracking = (projectId:number) => {
        chrome.runtime.sendMessage({
            type : 'SET_ACTIVE_PROJECT',
            projectId : projectId
        })
    }

    const stopTracking = () => {
        chrome.runtime.sendMessage({type : 'STOP_TRACKING'})
    }

    useEffect(() => {
        const loadCurrentSegment = async () => {
            const loaded = await getCurrentSegment()
            setCurrentSegment(loaded)
        }
        loadCurrentSegment()
    },[])

    useEffect(() =>{
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if(changes.currentSegment){
                setCurrentSegment((changes.currentSegment.newValue) as Segment | null)
            }
            if(changes.sessionStartTime){
                setSessionStartTime((changes.sessionStartTime.newValue) as number | null)
            }
        }
        chrome.storage.onChanged.addListener(handleStorageChange)
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange)
        }
    },[])

    useEffect(() => {
        const loadSessionStartTime = async () => {
            const loaded = await getSessionStartTime()
            setSessionStartTime(loaded)
        }
        loadSessionStartTime()
    },[])

    // 計測中は1秒ごとに「現在時刻」だけを更新する
    useEffect(() => {
        if( sessionStartTime === null) return
        const intervalId = setInterval(() => {
            setNow(Date.now())
        },1000)

        return () => {
            clearInterval(intervalId)
        }

    },[sessionStartTime])

    // 経過秒数は state にせず、開始時刻と現在時刻からレンダー中に計算する
    // （計測していないときは 0。開始直後に now が古くてマイナスになる場合も 0 にする）
    const elapsedSeconds = sessionStartTime === null
        ? 0
        : Math.max(0, Math.floor((now - sessionStartTime) / 1000))


    return (
        <TrackingContext.Provider value={{currentSegment, startTracking, stopTracking, sessionStartTime, elapsedSeconds, now}}>
        {children}
        </TrackingContext.Provider>
    )

}