import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import { Airplay } from 'lucide-react'
import { useState } from 'react';

const { ipcRenderer } = window.electron;

function App() {
  const [avisos, setAvisos] = useState<string[]>([])

  // Escute a resposta do processo principal.
  ipcRenderer.on('conversion-complete', (event, result) => {
    console.log(event)
    if (result.success) {
      console.log('PDF convertido com sucesso:', result.outputPath);
      // alert('PDF convertido com sucesso:'+ result.outputPath);
      setAvisos(prevState => {
        if (!prevState.includes(result.outputPath)) {
          return [...prevState, result.outputPath];
        } else {
          return prevState;
        }
      });

    } else {
      console.error('Erro na conversão:', result.error);
      alert('Erro na conversão:' + result.error);
    }
  });
  const [selectedFiles, setSelectedFiles] = useState<File[] | any>([]);

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(e.target.files);
    console.log(e.target.files)
  }
  async function convertToJPEG() {
    console.log(selectedFiles)
    for (const file of selectedFiles) {
      const pdfPath = file.path
      // const outputPath = `C:/Users/Estágio/Downloads`
      ipcRenderer.send('convert-pdf-to-image', { pdfPath });
    }
    alert('Arquivos convertidos com sucesso!');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-3 flex items-center justify-between border-b">
        <h1 className="text-xl font-bold">Aplicação PS</h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Colégio SEICE
          </span>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" onClick={() => { window.location.href = 'https://seice.com.br' }}>
            <Airplay className="w-4 h-4 mr-2" />
            Portal
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 flex gap-6 items-center justify-center">
        <div className="">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="files">Escolha um ou mais arquivos PDF:</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="application/pdf"
              onChange={handleFileSelection}

            />
            <Button onClick={convertToJPEG}>Converter para JPEG</Button>
            <h2 className='text-center'>Arquivos convertidos:</h2>
            {avisos.length > 0 && <div>{avisos.map((a: string) => <p key={a}>{a}</p>)}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
