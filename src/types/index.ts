export interface VideoSegment {
  id: string
  startTime: number
  endTime: number
  duration: number
  hasVoice: boolean
  confidence: number
  transcript: string
  objectUrl: string | null
}

export type ProcessingStage =
  | 'idle'
  | 'loading'
  | 'extracting-audio'
  | 'transcribing'
  | 'detecting-clips'
  | 'exporting'
  | 'done'
  | 'error'

export interface ProcessingState {
  stage: ProcessingStage
  progress: number
  message: string
  segments: VideoSegment[]
  error: string | null
}

export interface WhisperChunk {
  timestamp: [number, number | null]
  text: string
}
