import dynamic from 'next/dynamic'
const CVEditor = dynamic(() => import('../../components/CVEditor'), { ssr:false })

export default function Editor(){
  return (
    <main className="container">
      <h1>CV Editor</h1>
      <div className="card" style={{marginTop:12}}>
        <CVEditor />
      </div>
    </main>
  )
}
