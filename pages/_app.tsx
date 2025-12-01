import type { AppProps } from 'next/app'
import '../styles/globals.css'
import dynamic from 'next/dynamic'
import ToastProvider from '../components/ToastProvider'

const Header = dynamic(()=> import('../components/Header'), { ssr: false })

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <div>
        <Header />
        <Component {...pageProps} />
      </div>
    </ToastProvider>
  )
}
