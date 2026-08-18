import {
  ClipboardList, Palette, Hammer, TestTubes, Rocket, HeadphonesIcon
} from 'lucide-react'

export const methodologySteps = [
  {
    icon: ClipboardList,
    title: '1. Requirements Gathering',
    description: "We work closely with stakeholders to understand your business processes, workflows, pain points, users, and success criteria. This phase establishes the project scope and ensures we're solving the right problems before development begins.",
    color: 'bg-blue-500',
  },
  {
    icon: Palette,
    title: '2. Design',
    description: "We create wireframes, user flows, and modern interface designs that prioritize usability, efficiency, and scalability. You'll have an opportunity to review and refine the experience before development starts.",
    color: 'bg-indigo-500',
  },
  {
    icon: Hammer,
    title: '3. Build',
    description: 'Using modern development frameworks and AI-assisted engineering, we rapidly develop your application while maintaining high standards for code quality, maintainability, and performance.',
    color: 'bg-purple-500',
  },
  {
    icon: TestTubes,
    title: '4. QA & Client Acceptance Testing',
    description: "Before launch, we thoroughly test the application across devices and workflows. You'll also have dedicated time to validate functionality, provide feedback, and confirm everything meets your expectations.",
    color: 'bg-pink-500',
  },
  {
    icon: Rocket,
    title: '5. Deployment',
    description: 'Once approved, we deploy your application to a secure production environment with minimal disruption to your business operations.',
    color: 'bg-orange-500',
  },
  {
    icon: HeadphonesIcon,
    title: '6. Go-Live Support',
    description: "We're available during launch to monitor the rollout, address any issues quickly, and ensure your team is comfortable using the new system.",
    color: 'bg-green-500',
  },
]
