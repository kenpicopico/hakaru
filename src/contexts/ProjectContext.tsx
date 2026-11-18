import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { COLOR_PALETTE } from '../utils/color'
import { useSegments } from "../hooks/useSegments";
import { deleteSegments } from "../utils/storage";

export type Project = {
    id : number
    name : string
    clientId : number
    color : string
}

export type ProjectContextType = {
    projects : Project[]
    addProject : (name:string,clientId:number,color:string) => void
    renameProject : (id:number,name:string) => void
    deleteProject : (ids:number[]) => void
    changeProjectColor : (clientId:number, colors: readonly string[]) => void
    updateProjectColor: (projectId:number, color:string) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function useProjectContext(){
    const context = useContext(ProjectContext)
    if(!context){
        throw new Error ('useProjectContextはProjectProviderの中で使ってください')
    }
    return context
}

export type ProjectProviderProps = {
    children : ReactNode
}

export function ProjectProvider({children}:ProjectProviderProps){
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoaded, setIsLoaded] = useState<boolean>(false)
    const segments = useSegments()

    const addProject = (name:string,clientId:number,color:string) => {
        const newId = Date.now()
        const newProject = { id : newId, name : name, clientId : clientId, color : color}
        setProjects(prev => [...prev, newProject])
    }

    const renameProject = (id:number,name:string) => {
        setProjects(prev => prev.map(project => (
            project.id === id ? {...project, name:name} : project
        )) )
    }

    const deleteProject = (ids:number[]) => {
        setProjects(prev => prev.filter(project => !ids.includes(project.id)))
        const deleteSegmentsIds = segments.filter(segment => ids.includes(segment.projectId)).map(s => s.id)
        deleteSegments(deleteSegmentsIds)
    }

    const changeProjectColor = (clientId:number, colors: readonly string[]) => {
        setProjects(prev => {
            const ids = projects.filter(p => p.clientId === clientId).map(p => p.id)
            return prev.map(p => {
                const index = ids.indexOf(p.id)
                return index === -1 ? p : {...p, color : colors[index]}
            })
        })
    }

    const updateProjectColor = (projectId:number, color:string) => {
        setProjects(prev => prev.map(project => (
            project.id === projectId ? {...project, color : color} : project
        )))
    }

    useEffect(() => {
        const loadProjects = async () => {
            const result = await chrome.storage.local.get('projects')
            const loaded = (result.projects ?? [{ id : 101, name : '案件A', clientId : 1, color : COLOR_PALETTE[0].projects[0] }]) as Project[]
            setProjects(loaded)
            setIsLoaded(true)
        }
        loadProjects()
    },[])

    useEffect(() => {
        if(!isLoaded) return
        const setLocalProjects = async () => {
            await chrome.storage.local.set({'projects': projects})
        }
        setLocalProjects()
    },[projects,isLoaded])

    return (
        <ProjectContext.Provider value={{projects, addProject, renameProject, deleteProject, changeProjectColor, updateProjectColor}}>
            {children}
        </ProjectContext.Provider>
    )
}