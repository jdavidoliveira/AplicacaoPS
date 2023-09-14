import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Separator } from "./components/ui/separator"
import { Airplay } from "lucide-react"


function App() {

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
          <Label htmlFor="files">Escolha o arquivo PDF:</Label>
          <Input
            id="files"
            type="file"
            accept=".pdf"
          />
          <Button>Converter para JPEG</Button>
        </div>
        </div>
      </main>
    </div>
  )
}

export default App
