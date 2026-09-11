export const JOB_ROLES = [
  'Software Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Full Stack Developer',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'AI Engineer',
  'DevOps Engineer',
  'Embedded Engineer',
  'Product Manager',
  'Other'
] as const

/**
 * Topic guidance per role, used to steer the interviewer instead of a
 * hard-coded question bank. The AI picks a specific question from these
 * topics based on the resume, job description, and interview progress.
 */
export const ROLE_TOPICS: Record<string, string[]> = {
  'Software Engineer': [
    'Programming',
    'Data Structures',
    'Algorithms',
    'OOP',
    'Databases',
    'APIs',
    'System Design',
    'Testing',
    'Projects',
    'Behavioral'
  ],
  'Backend Engineer': [
    'APIs',
    'Databases',
    'System Design',
    'Caching',
    'Authentication',
    'Scalability',
    'Testing',
    'Projects',
    'Behavioral'
  ],
  'Frontend Engineer': [
    'JavaScript',
    'React',
    'CSS',
    'Browser Fundamentals',
    'Performance',
    'Accessibility',
    'State Management',
    'Testing',
    'Projects',
    'Behavioral'
  ],
  'Full Stack Developer': [
    'Frontend',
    'Backend',
    'Databases',
    'APIs',
    'System Design',
    'Deployment',
    'Projects',
    'Behavioral'
  ],
  'Data Engineer': [
    'SQL',
    'Python',
    'ETL',
    'Data Warehousing',
    'Spark',
    'Kafka',
    'Cloud',
    'Pipelines',
    'Data Modeling',
    'System Design'
  ],
  'Data Scientist': [
    'Python',
    'Statistics',
    'Probability',
    'Machine Learning',
    'Feature Engineering',
    'Model Evaluation',
    'Experimentation',
    'SQL',
    'Projects',
    'Behavioral'
  ],
  'Machine Learning Engineer': [
    'Python',
    'Machine Learning',
    'Deep Learning',
    'Model Deployment',
    'APIs',
    'Docker',
    'MLOps',
    'Monitoring',
    'System Design'
  ],
  'AI Engineer': [
    'LLMs',
    'Prompt Engineering',
    'Retrieval Augmented Generation',
    'APIs',
    'Model Evaluation',
    'System Design',
    'Projects',
    'Behavioral'
  ],
  'DevOps Engineer': [
    'CI/CD',
    'Containers',
    'Kubernetes',
    'Cloud Infrastructure',
    'Monitoring',
    'Networking',
    'Scripting',
    'Incident Response',
    'Projects'
  ],
  'Embedded Engineer': [
    'C/C++',
    'Microcontrollers',
    'UART',
    'SPI',
    'I2C',
    'Interrupts',
    'RTOS',
    'Debugging',
    'Hardware/Software Interaction',
    'Projects'
  ],
  'Product Manager': [
    'Product Strategy',
    'Prioritization',
    'Metrics',
    'User Research',
    'Stakeholder Management',
    'Roadmapping',
    'Case Studies',
    'Behavioral'
  ],
  Other: ['General Technical', 'Problem Solving', 'Projects', 'Behavioral']
}

export function getTopicsForRole(jobRole: string): string[] {
  return ROLE_TOPICS[jobRole] ?? ROLE_TOPICS.Other
}
