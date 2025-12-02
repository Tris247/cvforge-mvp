import { renderSimpleTemplate } from '../lib/template';
export default function CVPreview({content, name}:{content?: string, name?: string}){
  const html = renderSimpleTemplate(content || 'No content yet', name||'Candidate');
  return (
    <div style={{marginTop:12}}>
      <h4>Preview</h4>
      <div style={{border:'1px solid rgba(255,255,255,0.06)', borderRadius:6, overflow:'hidden'}}>
        <iframe srcDoc={html} title="cv preview" style={{width:'100%', height:320, border:0}} />
      </div>
    </div>
  )
}
