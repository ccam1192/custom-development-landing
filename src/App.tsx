import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BookACallPage from './pages/BookACallPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book-a-call" element={<BookACallPage />} />
      </Routes>
    </BrowserRouter>
  )
}
