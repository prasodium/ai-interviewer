import Button from './Button'
import { api } from '../services/electronApi'

interface ResumeUploadProps {
  filePath: string | null
  onFileSelected: (filePath: string | null) => void
}

function fileNameFromPath(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

export default function ResumeUpload({ filePath, onFileSelected }: ResumeUploadProps): JSX.Element {
  async function handlePickFile(): Promise<void> {
    const selected = await api.dialog.pickResumeFile()
    if (selected) {
      onFileSelected(selected)
    }
  }

  return (
    <div className="field">
      <label>Resume</label>
      <div className="row">
        <Button type="button" variant="secondary" onClick={handlePickFile}>
          {filePath ? 'Change PDF' : 'Upload PDF'}
        </Button>
        {filePath && <span className="text-muted">{fileNameFromPath(filePath)}</span>}
      </div>
    </div>
  )
}
