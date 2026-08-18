import Navigation from '../components/Navigation'
import RequirementsHero from '../components/RequirementsHero'
import RequirementsProblem from '../components/RequirementsProblem'
import RequirementsIncluded from '../components/RequirementsIncluded'
import RequirementsDeliverable from '../components/RequirementsDeliverable'
import RequirementsConfidence from '../components/RequirementsConfidence'
import RequirementsProcess from '../components/RequirementsProcess'
import RequirementsObjection from '../components/RequirementsObjection'
import RequirementsNextSteps from '../components/RequirementsNextSteps'
import RequirementsFinalCTA from '../components/RequirementsFinalCTA'
import Footer from '../components/Footer'
import { usePageMeta } from '../hooks/usePageMeta'

const TITLE = 'Requirements Gathering for Custom Software | Boardroom'
const DESCRIPTION =
  'Define your custom software project before development begins. Our $500 Requirements Gathering Package includes up to two discovery sessions and a detailed requirements document to clarify your project and establish a foundation for development.'

export default function RequirementsGatheringPage() {
  usePageMeta({
    title: TITLE,
    description: DESCRIPTION,
    ogTitle: TITLE,
    ogDescription: DESCRIPTION,
    ogUrl: 'https://lp.ecommboardroom.com/requirements-gathering',
  })

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <RequirementsHero />
      <RequirementsProblem />
      <RequirementsIncluded />
      <RequirementsDeliverable />
      <RequirementsConfidence />
      <RequirementsProcess />
      <RequirementsObjection />
      <RequirementsNextSteps />
      <RequirementsFinalCTA />
      <Footer />
    </div>
  )
}
