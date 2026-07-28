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
                <a href="#services" className="hover:text-white transition-colors">Services</a>
              </li>
              <li>
                <a href="#methodology" className="hover:text-white transition-colors">Methodology</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">Contact</a>
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
