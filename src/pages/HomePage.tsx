import Navigation from '../components/Navigation'
import Hero from '../components/Hero'
import Trust from '../components/Trust'
import WhyNow from '../components/WhyNow'
import Services from '../components/Services'
import Methodology from '../components/Methodology'
import WhyBoardroom from '../components/WhyBoardroom'
import Pricing from '../components/Pricing'
import FAQ from '../components/FAQ'
import Contact from '../components/Contact'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'
import { usePageMeta } from '../hooks/usePageMeta'

export default function HomePage() {
  usePageMeta({
    title: 'Boardroom | Custom Software Development',
    description:
      'Boardroom builds custom software tailored to your business—internal tools, AI integrations, dashboards, portals, and SaaS platforms. Faster and more affordable than ever.',
    ogTitle: 'Boardroom | Custom Software Development',
    ogDescription:
      'Build the software your business actually needs. Custom applications delivered faster and more affordably than ever before.',
  })

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Trust />
      <WhyNow />
      <Services />
      <Methodology />
      <WhyBoardroom />
      <Pricing />
      <FAQ />
      <Contact />
      <FinalCTA />
      <Footer />
    </div>
  )
}
