import { useEffect, useState, type ChangeEvent } from "react"
import { getOpenOnStartup, setOpenOnStartup, setIdleMinutes, getIdleMinutes, setAutoStopMinutes, getAutoStopMinutes } from "../../../../utils/storage"
import { TimeDropdown } from "./TimeDropdown"
import { downloadBackup, importData } from "../../../../utils/backup"
import { useTrackingContext } from "../../../../contexts/TrackingContext"
import { WarningPopup } from "../../../common/WarningPopup"

const IDLE_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1)
const AUTO_STOP_OPTIONS = Array.from({ length: 9 }, (_, i) => 60 + i * 30)
const WARNING_TRACKING_ACTIVE = '※バックアップを行う前にトラッキングを終了してください。'
const WARNING_TRACKING_ACTIVE_IMPORT = '※データの復元を行う前にトラッキングを終了してください。'
// const IMPORT_COMPLETE = 'データが復元されました。'
const IMPORT_NOT_COMPLETE = 'データの復元に失敗しました。'


export function SettingsTab(){
    const [openOnStartup, setOpenOnStartupState ] = useState<boolean>(true)
    const [ idleMinutes, setIdleMinutesState ] = useState<number>(10)
    const [ autoStopMinutes, setAutoStopMinutesState ] = useState<number>(120)
    const { currentSegment } = useTrackingContext()
    const [ message, setMessage ] = useState<string | null>(null)
    const [ importText, setImportText ] = useState<string | null>(null)

    useEffect(() => {
        const loadOpenOnStartup = async () => {
            const loaded = await getOpenOnStartup()
            setOpenOnStartupState(loaded)
        }
        loadOpenOnStartup()
    },[])

    const handleOpenOnStartup = async () => {
        const next = !openOnStartup
        setOpenOnStartupState(next)
        await setOpenOnStartup(next)
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

    const handleDownloadBackup = () => {
        if(currentSegment === null){
            downloadBackup()
        } else{
            setMessage(WARNING_TRACKING_ACTIVE)
        }
    }

    const handleImportData = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if(currentSegment !== null){
            setMessage(WARNING_TRACKING_ACTIVE_IMPORT)
            return
        }
        if (!file) return
        const text = await file.text()
        setImportText(text)
    }

    const handleConfirmImport = async () => {
        if (importText === null) return
        const success = await importData(importText)
        setImportText(null)
        if (success) {
            window.location.reload()
            return
        }
        setMessage(IMPORT_NOT_COMPLETE)
    }

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
                        <div className="p-setting__row">
                            <p className="p-setting__name">データのバックアップ</p>
                            <button
                                type="button"
                                className="p-setting__backup"
                                onClick={handleDownloadBackup}
                            >
                                バックアップ
                            </button>
                        </div>
                        <div className="p-setting__row baseline">
                            <p className="p-setting__name">データのインポート<br /><span className="p-setting__name-note">※現在のデータを全て削除した後に<br/>インポートしたデータを反映します</span></p>
                            <div className="p-setting__import">
                                <input
                                    type="file"
                                    accept=".json"
                                    id="data_import"
                                    className="p-setting__import-input"
                                    onChange={handleImportData}
                                />
                                <label className="p-setting__import-label" htmlFor="data_import">データの復元</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {message !== null && (
                <WarningPopup message={message} onClose={() => setMessage(null)} />
            )}
            {importText !== null && (
                <div className='p-delete-modal' onClick={() => setImportText(null)}>
                    <div className='p-delete-modal__inner' onClick={(e) => e.stopPropagation()}>
                        <button className='p-delete-modal__close' onClick={() => setImportText(null)}><img src="./images/icon_close.svg" alt="閉じる" /></button>
                        <p className='p-delete-modal__text'>復元を実行すると、<br/>現在の全データは削除されます。<br/>復元しますか？</p>
                        <p className='p-delete-modal__caution'>※この操作は取り消せません。</p>
                        <div className='p-delete-modal__buttons'>
                            <button className='no' onClick={() => setImportText(null)}>キャンセル</button>
                            <button className='yes' onClick={handleConfirmImport}>復元する</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}