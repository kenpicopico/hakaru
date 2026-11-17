import './LargeWindow.scss'
import { Sidebar } from './Sidebar/Sidebar'
import { ContentArea } from './ContentArea/ContentArea'
import { useState } from 'react'
import { useProjectContext } from '../../contexts/ProjectContext'

export type ActiveTab = 'today' | 'stats' | 'settings' | 'login' | 'projectDetail'

type LargeWindowProps = {
    onShrink : () => void
}

export function LargeWindow({onShrink}:LargeWindowProps){
    const [activeTab, setActiveTab] = useState<ActiveTab>('today')
    const [viewingProjectId, setViewingProjectId] = useState<number | null>(null)
    const { projects } = useProjectContext()

    // 案件一覧が変わったら、表示中の案件が削除されていないか確認する。
    // useEffect ではなく「レンダー中に state を調整する」書き方にして、余分な再レンダーを防ぐ
    const [prevProjects, setPrevProjects] = useState(projects)
    if(projects !== prevProjects){
        setPrevProjects(projects)
        if(viewingProjectId !== null && !projects.some(project => project.id === viewingProjectId)){
            setViewingProjectId(null)
            setActiveTab('today')
        }
    }

    return (
        <>
            <div className='p-large'>
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} viewingProjectId={viewingProjectId} setViewingProjectId={setViewingProjectId} />
                <ContentArea activeTab={activeTab} viewingProjectId={viewingProjectId} />
                <button className='p-large__shrink-button c-tooltip__shrink' data-tooltip="最小化" onClick={onShrink}><img src="./images/icon_expand.svg" alt="" /></button>
            </div>
        </>
    )
}