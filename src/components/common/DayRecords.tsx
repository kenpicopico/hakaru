import { useState } from "react"
import { useDayRecords } from "../../hooks/useDayRecords"
import { useProjectContext } from "../../contexts/ProjectContext"
import { useClientBreakdown } from "../../hooks/useClientBreakdown"
import { useTrackingContext } from "../../contexts/TrackingContext"
import { useSelectionContext } from "../../contexts/SelectionContext"
import { formatHoursMinutes, setTimeOfDay } from "../../utils/time"
import { useClientContext } from "../../contexts/ClientContext"
import { TimeDropdown } from "../LargeWindow/ContentArea/tabs/TimeDropdown"
import { SelectDropdown } from "../LargeWindow/ContentArea/tabs/SelectDropdown"
import { WarningPopup } from "./WarningPopup"
import { SegmentDeleteModal } from "../LargeWindow/ContentArea/tabs/SegmentDeleteModal/SegmentDeleteModal"
import { updateSegment, deleteSegment, findFreeSlot, addNewSegment, type FinishedSegment, type SegmentError } from "../../utils/storage"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60}, (_, i) => i)
type TimeField = 'startTime' | 'endTime'
type TimeUnit = 'hours' | 'minutes'
const WARNING_MESSAGES: Record<SegmentError, string> = {
    START_AFTER_END: '※開始時刻は終了時刻より前に設定してください。',
    FUTURE: '※現在より後の時刻には設定できません。',
    OVERLAP: '※他の記録の時間帯と重なるため、設定できません。',
    OVERLAP_CURRENT: '※計測中の時間帯と重なるため、設定できません。',
    NOT_FOUND: '※記録が見つかりませんでした。\n画面を開き直してください。',
    NO_FREE_SLOT: '※空き時間がないため、記録を追加できません。',
    NO_PROJECT: '※記録を追加するには案件が必要です。\nサイドバーから案件を追加してください。'
}

export type DayRecordsProps = {
    date : Date
}

export const DayRecords = ({date}:DayRecordsProps) => {
    const { dayStartMs, dayEndMs, daySegments} = useDayRecords(date)
    const { projects } = useProjectContext()
    const { clients } = useClientContext()
    const { clientBreakdown } = useClientBreakdown(daySegments)
    const { currentSegment } = useTrackingContext()
    const { projectId } = useSelectionContext()

    const [ warning, setWarning ] = useState<SegmentError | null>(null)
    const [ deleteTargetId, setDeleteTargetId ] = useState<number | null>(null)
    const [ editingId, setEditingId] = useState<number | null>(null)
    const [ draft, setDraft ] = useState<{ startTime: number, endTime: number } | null>(null)
    const [ highlightId, setHighlightId ] = useState<number | null>(null)

    const now = Date.now()
    const isToday = now >= dayStartMs && now < dayEndMs

    const handleClientChange = (segmentId:number, clientId:number, currentClientId:number | undefined) => {
        if(clientId === currentClientId) return
        const clientProjects = projects.filter(p => p.clientId === clientId)
        const first = clientProjects[0]
        if(!first) return
        handleProjectChange(segmentId,first.id)
    }

    const handleProjectChange = async (segmentId:number,projectId:number) =>{
        const error = await updateSegment(segmentId, { projectId : projectId })
        if(error !== null) return setWarning(error)
    }
    //案件が最低1つはあるクライアントの配列
    const clientsWithProjects = clients.filter(c => projects.some(p => p.clientId === c.id))

    const currentSegmentProject = projects.find(p => p.id === currentSegment?.projectId)
    const currentSegmentClient = clients.find(c => c.id === currentSegmentProject?.clientId)

    const handleAddSegment = async () => {
        if(projectId === null){
            setWarning('NO_PROJECT')
            return
        }
        const startTime = findFreeSlot(dayStartMs, daySegments, currentSegment)
        if(startTime === null) {
            setWarning('NO_FREE_SLOT')
            return 
        }
        const addedId = await addNewSegment(startTime, projectId)
        setHighlightId(addedId)
        setTimeout(() => setHighlightId(null), 1000)
    }




    // 編集開始：今の値を下書きにコピー
    const handleEditStart = (segment: FinishedSegment) => {
        setEditingId(segment.id)
        setDraft({ startTime: segment.startTime, endTime: segment.endTime })
    }

    // 下書きの時・分を変更（updateSegmentは呼ばない）
    const handleDraftChange = (field: TimeField, unit: TimeUnit, value: number) => {
        setDraft(prev => {
            if (prev === null) return prev
            const base = prev[field]
            const hours = unit === 'hours' ? value : new Date(base).getHours()
            const minutes = unit === 'minutes' ? value : new Date(base).getMinutes()
            return { ...prev, [field]: setTimeOfDay(base, hours, minutes) }
        })
    }

    // 確定：ここで初めて検証・保存
    const handleConfirm = async (segmentId: number) => {
        if (draft === null) return
        const error = await updateSegment(segmentId, draft)
        if (error !== null) {
            setWarning(error)   // 編集モードは維持して、直せるようにする
            return
        }
        setEditingId(null)
        setDraft(null)
    }

    // キャンセル
    const handleCancel = () => {
        setEditingId(null)
        setDraft(null)
    }

    const formatClock = (time: number) => {
        const date = new Date(time)
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
    }


    return (
        <div className="c-content-inner">
            <div className="p-today__map">
                {daySegments.map(segment => {
                    const startPercent = ((segment.startTime - dayStartMs) / (24 * 60 * 60 *1000)) * 100
                    const endPercent = ((segment.endTime - dayStartMs) / (24 * 60 * 60 *1000)) * 100
                    const width = endPercent - startPercent
                    const project = projects.find(project => project.id === segment.projectId)
                    return(
                        <div
                            className='p-today__map-area'
                            key={segment.id}
                            style={{
                                width : `${width}%`,
                                left : `${startPercent}%`,
                                backgroundColor : `${project?.color}`
                            }}
                        />
                    )
                })}
                <p className='am0'>0:00</p>
                <p className='am4'>4:00</p>
                <p className='am8'>8:00</p>
                <p className='am12'>12:00</p>
                <p className='pm4'>16:00</p>
                <p className='pm8'>20:00</p>
                <p className='pm12'>24:00</p>
            </div>
            <ul className="p-today__bd">
                {clientBreakdown.map((cb) => (
                    <li key={cb.clientId} className="p-today__bd-item">
                        <span style={{background:`${cb.clientColor}`}} className="client-color" />
                        {formatHoursMinutes(cb.totalSeconds)}
                        <span className="brackets">（</span>
                        <ul className="p-today__bd-projects">
                            {cb.projects.map(project => (
                            <li key={project.projectId} className="project">
                                <span style={{ background : `${project.projectColor}`}} className="project-color" />
                                {formatHoursMinutes(project.totalSeconds)}
                            </li>
                            ))}
                        </ul>
                        <span>）</span>
                    </li>
                ))}
            </ul>
            <div className="p-today__details">
                <ul className="p-today__details-title">
                    <li className="color"></li>
                    <li className="start">開始</li>
                    <li className="separate"></li>
                    <li className="finish">終了</li>
                    <li className="edit">編集</li>
                    <li className="client">クライアント</li>
                    <li className="project">案件</li>
                    <li className="delete">削除</li>
                </ul>
                <ul className="p-today__details-data">

                    {daySegments.map(segment => {
                        const project = projects.find(project => project.id === segment.projectId)
                        const client = clients.find(client => project?.clientId === client.id)
                        const currentProjects = projects.filter(project => project.clientId === client?.id)

                        const isEditing = segment.id === editingId && draft !== null
                        const startTime = isEditing ? draft.startTime : segment.startTime
                        const endTime = isEditing ? draft.endTime : segment.endTime
                        return (
                            <li key={segment.id} className={`item ${segment.id === highlightId ? 'is-added' : ''}`}>
                                <span style={{background : `${project?.color}`}} className="color" />

                                <div className="start">
                                    {isEditing ? (
                                        <>
                                            <TimeDropdown 
                                                value={new Date(startTime).getHours()} 
                                                options={HOURS}
                                                onSelect={(n) => handleDraftChange('startTime', 'hours', n)}
                                             />
                                            <span className="colon">:</span>
                                            <TimeDropdown 
                                                value={new Date(startTime).getMinutes()} 
                                                options={MINUTES}
                                                onSelect={(n) => handleDraftChange('startTime', 'minutes', n)}
                                             />
                                        </>
                                    ) : (
                                        <p className="default-time">{formatClock(startTime)}</p>
                                    )}
                                </div>
                                <span className="separate">〜</span>

                                <div className="finish">
                                    {isEditing ? (
                                        <>
                                            <TimeDropdown 
                                                value={new Date(endTime).getHours()} 
                                                options={HOURS}
                                                onSelect={(n) => handleDraftChange('endTime', 'hours', n)}
                                             />
                                            <span className="colon">:</span>
                                            <TimeDropdown 
                                                value={new Date(endTime).getMinutes()} 
                                                options={MINUTES}
                                                onSelect={(n) => handleDraftChange('endTime', 'minutes', n)}
                                             />
                                        </>
                                    ) : (
                                        <p className="default-time">{formatClock(endTime)}</p>
                                    )}
                                </div>

                                <div className="edit">
                                    {isEditing ? (
                                        <>
                                            <button className="btn" onClick={() => handleConfirm(segment.id)}><img src="./images/icon_confirm.svg" alt="" /></button>
                                            <button className="btn" onClick={handleCancel}><img src="./images/icon_cancel.svg" alt="" /></button>
                                        </>
                                    ) : (
                                        <button className="edit-btn" onClick={() => handleEditStart(segment)} disabled={editingId !== null}><img src="./images/icon_edit.svg" alt="" /></button>
                                    )}
                                </div>

                                <div className="client c-select__outer">
                                    <SelectDropdown 
                                        value={client?.name} 
                                        options={clientsWithProjects}
                                        onSelect={(clientId) => handleClientChange(segment.id, clientId,client?.id)}
                                        />
                                </div>
                                <div className="project c-select__outer">
                                    <SelectDropdown 
                                        value={project?.name} 
                                        options={currentProjects} 
                                        onSelect={(projectId) => handleProjectChange(segment.id,projectId)}
                                    />
                                </div>
                                <button className="delete" onClick={() => setDeleteTargetId(segment.id)} disabled={editingId !== null}><img src="./images/icon_delete.svg" alt="" /></button>
                            </li>
                        )
                    })}

                    { isToday && currentSegment !== null && currentSegment.status === 'working' && (
                        <li className="item">
                            <span style={{background : `${currentSegmentProject?.color}`}} className="color" />
                            <div className="start">
                                <p className="default-time">{formatClock(currentSegment.startTime)}</p>
                            </div>
                            <span className="separate">〜</span>
                            <div className='tracking'>
                                <p>tracking</p>
                            </div>
                            <div className="edit"></div>
                            <div className="client">
                                <p className='cs-name'>{currentSegmentClient?.name}</p>
                            </div>
                            <div className="project">
                                <p className='cs-name'>{currentSegmentProject?.name}</p>
                            </div>
                            <div className='delete empty'></div>
                        </li>
                    )}
                    
                </ul>
                <button className="p-today__details-add" onClick={handleAddSegment} disabled={editingId !== null}><img src="./images/icon_plus.svg" alt="" />記録を追加</button>
            </div>
            {warning !== null && (
                <WarningPopup message={WARNING_MESSAGES[warning]} onClose={() => setWarning(null)} />
            )}
            {deleteTargetId !== null && (
                <SegmentDeleteModal 
                    onConfirm={async () => {
                        await deleteSegment(deleteTargetId)
                        if (deleteTargetId === editingId) { setEditingId(null); setDraft(null) }
                        setDeleteTargetId(null)
                    }}
                    onCancel={() => setDeleteTargetId(null)}
                />
            )}
        </div>
    )
}