import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/Sidebar"
import { ProxyList } from "@/pages/ProxyList"
import { Toaster } from "@/components/ui/toaster"
import { RouteList } from "@/pages/RouteList"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen">
          <Sidebar />
          <main className="p-4 lg:p-8 pt-20">
            <Routes>
              <Route path="/proxy-list" element={<ProxyList />} />
              <Route path="/routes/:proxyName" element={<RouteList />} />
              <Route path="/" element={
                <div className="text-center text-muted-foreground">
                  Lütfen menüden bir seçim yapın
                </div>
              } />
            </Routes>
          </main>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
