

export const BACKUP_VERSION = 1

const BACKUP_KEYS = [ 'clients', 'projects', 'segments', 'selectedProjectId', 'idleMinutes', 'openOnStartup', 'autoStopMinutes']

export const createBackup = async () => {
    const data = await chrome.storage.local.get(BACKUP_KEYS)
    return {
        version : BACKUP_VERSION,
        exportedAt : Date.now(),
        data
    }
}

export const downloadBackup = async () => {
    const backup = await createBackup()
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const a = document.createElement('a')
    const pad = (n : number) => String(n).padStart(2, '0')
    // 同じ日に何度バックアップしても名前が被らないよう、時刻（時分秒）まで入れる
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    const filename = `hakaru-backup-${date}_${time}.json`
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

const isPlainObject = (value : unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const validateBackup = (json: unknown) => {
    if(!isPlainObject(json)) return null
    if(json.version !== BACKUP_VERSION) return null
    if(!isPlainObject(json.data)) return null
    const data = json.data 

    if(!isValidClients(data.clients)) return null
    if(!isValidProjects(data.projects)) return null
    if(!isValidSegments(data.segments)) return null

    // 持ち主のいないデータは取り除いてから復元する
    // （以前は案件を削除しても記録が残っていたため、古いバックアップには持ち主のいない記録が含まれることがある）
    // クライアントがいない案件を取り除く
    const clientIds = new Set(data.clients.map(c => c.id))
    const projects = data.projects.filter(p => clientIds.has(p.clientId))

    // 案件がいない記録を取り除く（上で取り除いた案件の記録もここで一緒に消える）
    const projectIds = new Set(projects.map(p => p.id))
    const segments = data.segments.filter(s => projectIds.has(s.projectId))

    // selectedProjectId が取り除いた案件を指していたら null にする（SelectionContext が先頭の案件を選び直す）
    const selected = data.selectedProjectId
    const selectedProjectId = typeof selected === 'number' && projectIds.has(selected) ? selected : null

    // idleMinutes（1〜60の整数）
    const idle = data.idleMinutes
    if (idle !== undefined) {
        if (typeof idle !== 'number' || !Number.isInteger(idle) || idle < 1 || idle > 60) return null
    }

    // autoStopMinutes（60〜300、30刻み）
    const autoStop = data.autoStopMinutes
    if (autoStop !== undefined) {
        if (typeof autoStop !== 'number' || autoStop < 60 || autoStop > 300 || autoStop % 30 !== 0) return null
    }

    // openOnStartup（真偽値）
    const openOnStartup = data.openOnStartup
    if (openOnStartup !== undefined && typeof openOnStartup !== 'boolean') return null

    return {
        clients: data.clients,
        projects,
        segments,
        selectedProjectId,
        idleMinutes: data.idleMinutes,
        autoStopMinutes: data.autoStopMinutes,
        openOnStartup: data.openOnStartup,
    }
}

type BackupClient = { id: number, name: string, color: string }
const isValidClients = (value:unknown):value is BackupClient[] => {
    return Array.isArray(value) && value.every(c => (
        isPlainObject(c) &&
        Number.isFinite(c.id) &&
        typeof c.name === 'string' &&
        typeof c.color === 'string'
    ))
}

type BackupProject = { id: number, name: string, clientId: number, color: string }
const isValidProjects = (value:unknown): value is BackupProject[] => {
    return Array.isArray(value) && value.every(p => (
        isPlainObject(p) &&
        Number.isFinite(p.id) &&
        typeof p.name === 'string' &&
        Number.isFinite(p.clientId) &&
        typeof p.color === 'string'
    ))
}

type BackupSegment = { id: number, startTime: number, endTime: number, projectId: number, status: 'working'}
const isValidSegments = (value:unknown):value is BackupSegment[] => {
    return Array.isArray(value) && value.every(s => (
        isPlainObject(s) &&
        Number.isFinite(s.id) &&
        Number.isFinite(s.startTime) &&
        Number.isFinite(s.endTime) &&
        Number.isFinite(s.projectId) &&
        s.status === 'working' &&
        typeof s.startTime === 'number' &&
        typeof s.endTime === 'number' &&
        s.startTime <= s.endTime
    ))
}


export const restoreBackup = async (data: Record<string, unknown>) => {
    await chrome.storage.local.remove(BACKUP_KEYS)
    const entries = Object.entries(data)
    const defined = entries.filter(([, value]) => value !== undefined)
    const toSave = Object.fromEntries(defined)
    await chrome.storage.local.set(toSave)
}

export const importData = async (text:string):Promise<boolean> => {
    try{
        const json = JSON.parse(text)
        const data = validateBackup(json)
        if(data === null) return false
        await restoreBackup(data)
        return true
    } catch {
        return false
    }
}