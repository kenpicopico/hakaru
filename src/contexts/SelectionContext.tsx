import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useProjectContext } from "./ProjectContext";

export type SelectionContextType = {
    projectId: number | null
    selectProject: (id:number) => void
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined)

export function useSelectionContext(){
    const context = useContext(SelectionContext)
    if(!context){
        throw new Error ('useSelectionContextはSelectionProviderの中で使ってください')
    }
    return context
}

export type SelectionProviderProps = {
    children : ReactNode
}

export function SelectionProvider({children}:SelectionProviderProps){
    const [projectId, setProjectId] = useState<number | null>(101)
    const [isLoaded, setIsLoaded] = useState<boolean>(false)
    const { projects } = useProjectContext()

    const selectProject = (id:number) => {
        setProjectId(id)
    }

    useEffect(() => {
        const loadProjectId = async () => {
            const result = await chrome.storage.local.get('selectedProjectId')
            const loaded = (result.selectedProjectId ?? 101) as number
            setProjectId(loaded)
            setIsLoaded(true)
        }
        loadProjectId()
    },[])

    useEffect(() => {
        if(!isLoaded) return
        const setLocalProjectId = async () => {
            await chrome.storage.local.set({ 'selectedProjectId' : projectId })
        }
        setLocalProjectId()
    },[projectId, isLoaded])

    // 案件一覧が変わったときだけ、選択中の案件がまだ存在するか確認する。
    // useEffect ではなく「レンダー中に state を調整する」書き方にして、余分な再レンダーを防ぐ。
    // projectId の変化では確認しない（案件の読み込み前に選択が null で上書き保存されてしまうため）
    const [prevProjects, setPrevProjects] = useState(projects)
    if(projects !== prevProjects){
        setPrevProjects(projects)
        if(!projects.some(project => project.id === projectId)){
            setProjectId(projects.length === 0 ? null : projects[0].id)
        }
    }

    return (
        <SelectionContext.Provider value={{projectId,selectProject}}>
            {children}
        </SelectionContext.Provider>
    )
}