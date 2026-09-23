import { Link } from 'react-router-dom'
import SiteHashLink from './SiteHashLink'
import { PATHS } from '../config'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="text-xl font-bold text-white mb-2">Boardroom</div>
            <p className="text-sm text-gray-500">Custom Software Development</p>
            <p className="text-sm mt-4">
              <a
                href="mailto:outreach@ecommboardroom.com"
                className="hover:text-white transition-colors"
              >
                outreach@ecommboardroom.com
              </a>
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <SiteHashLink hash="#services" className="hover:text-white transition-colors">
                  Services
                </SiteHashLink>
              </li>
              <li>
                <SiteHashLink hash="#methodology" className="hover:text-white transition-colors">
                  Methodology
                </SiteHashLink>
              </li>
              <li>
                <SiteHashLink hash="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </SiteHashLink>
              </li>
              <li>
                <SiteHashLink hash="#faq" className="hover:text-white transition-colors">
                  FAQ
                </SiteHashLink>
              </li>
              <li>
                <SiteHashLink hash="#contact" className="hover:text-white transition-colors">
                  Contact
                </SiteHashLink>
              </li>
              <li>
                <Link to={PATHS.technologyPartners} className="hover:text-white transition-colors">
                  Technology Partners
                </Link>
              </li>
              <li>
                <Link to={PATHS.accountingFirms} className="hover:text-white transition-colors">
                  For Accounting Firms
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.ecommboardroom.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/the-ecommerce-boardroom/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} Boardroom Custom Software Development. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
