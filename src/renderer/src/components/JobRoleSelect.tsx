import { JOB_ROLES } from '@shared/constants/jobRoles'

interface JobRoleSelectProps {
  selectedRole: string
  customRole: string
  onSelectedRoleChange: (role: string) => void
  onCustomRoleChange: (role: string) => void
}

export default function JobRoleSelect({
  selectedRole,
  customRole,
  onSelectedRoleChange,
  onCustomRoleChange
}: JobRoleSelectProps): JSX.Element {
  return (
    <div className="field">
      <label htmlFor="job-role">Job Role</label>
      <select
        id="job-role"
        value={selectedRole}
        onChange={(event) => onSelectedRoleChange(event.target.value)}
      >
        {JOB_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      {selectedRole === 'Other' && (
        <input
          type="text"
          placeholder="Enter the job role"
          value={customRole}
          onChange={(event) => onCustomRoleChange(event.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  )
}
