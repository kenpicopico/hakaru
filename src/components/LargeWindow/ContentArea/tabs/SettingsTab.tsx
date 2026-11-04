import { useEffect, useState } from "react"
import { getOpenOnStartup, setOpenOnStartup, setIdleMinutes, getIdleMinutes, setAutoStopMinutes, getAutoStopMinutes } from "../../../../utils/storage"
import { TimeDropdown } from "./TimeDropdown"

const IDLE_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1)
const AUTO_STOP_OPTIONS = Array.from({ length: 9 }, (_, i) => 60 + i * 30)

export function SettingsTab(){
    const [openOnStartup, setOpenOnStartupState ] = useState<boolean>(true)
    const [ idleMinutes, setIdleMinutesState ] = useState<number>(10)
    const [ autoStopMinutes, setAutoStopMinutesState ] = useState<number>(120)

    useEffect(() => {
        const loadOpenOnStartup = async () => {
            const loaded = await getOpenOnStartup()
            setOpenOnStartupState(loaded)
        }
        loadOpenOnStartup()
    },[])

    const handleOpenOnStartup = async () => {
        const next = !openOnStartup
        await setOpenOnStartup(next)
        setOpenOnStartupState(next)
    }

    const handleIdleChange = async (value: number) => {
        setIdleMinutesState(value)
        await setIdleMinutes(value)
    }
    useEffect(() => {
        const loadIdleMinutes = async () => {
            const loaded = await getIdleMinutes()
            setIdleMinutesState(loaded)
        }
        loadIdleMinutes()
    },[])

    const handleAutoStopMinutes = async (value: number) => {
        setAutoStopMinutesState(value)
        await setAutoStopMinutes(value)
    }
    useEffect(() => {
        const loadAutoStopMinutes = async () => {
            const loaded = await getAutoStopMinutes()
            setAutoStopMinutesState(loaded)
        }
        loadAutoStopMinutes()
    },[])

    return (
        <div className="c-content-outer">
            <div className="p-today__head">
                <div className="p-setting">
                    <p className="p-setting__title">設定</p>
                    <div className="p-setting__box">
                        <div className="p-setting__row">
                            <p className="p-setting__name">休憩判定（idling）になるまでの時間</p>
                            <div className="p-setting__wrap">
                                <TimeDropdown
                                    value={idleMinutes}
                                    options={IDLE_OPTIONS}
                                    onSelect={handleIdleChange}
                                />
                                <span>分</span>
                            </div>
                        </div>
                        <div className="p-setting__row">
                            <p className="p-setting__name">自動トラッキング停止までの時間</p>
                            <div className="p-setting__wrap">
                                <TimeDropdown
                                    value={autoStopMinutes}
                                    options={AUTO_STOP_OPTIONS}
                                    onSelect={handleAutoStopMinutes}
                                />
                                <span>分</span>
                            </div>
                        </div>
                        <div className="p-setting__row">
                            <p className="p-setting__name">ブラウザを開いたときに自動的に開く</p>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={openOnStartup}
                                className={`p-setting__toggle ${openOnStartup ? 'is-on' : ''}`}
                                onClick={handleOpenOnStartup}
                            >
                                <span className="p-setting__toggle-knob" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}