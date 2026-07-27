import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Trust from './components/Trust'
import WhyNow from './components/WhyNow'
import Services from './components/Services'
import Methodology from './components/Methodology'
import WhyBoardroom from './components/WhyBoardroom'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import Contact from './components/Contact'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function App() {
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
